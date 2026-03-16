import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories';
import { UserPolicies } from '../../domain/policies/user-policies';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Input for getting a user
 */
export interface GetUserInput {
  userId: string;
  requestingUserId?: string; // For authorization checks
  fields?: string[]; // Optional field selection
}

/**
 * Output from getting a user
 */
export interface GetUserOutput {
  user: User | null;
  success: boolean;
  message: string;
}

/**
 * Use case for retrieving user information
 * Handles authorization, field selection, and privacy controls
 */
export class GetUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  /**
   * Execute the get user use case
   */
  async execute(input: GetUserInput): Promise<GetUserOutput> {
    try {
      logger.info('Getting user', { targetUserId: input.userId, requestingUserId: input.requestingUserId });

      // Check if user exists
      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return {
          user: null,
          success: false,
          message: 'User not found'
        };
      }

      // Authorization check
      const canAccess = this.checkAccessPermission(user, input.requestingUserId);
      if (!canAccess.allowed) {
        return {
          user: null,
          success: false,
          message: canAccess.reason || 'Access denied'
        };
      }

      // Apply field selection if specified
      const filteredUser = input.fields ? this.filterUserFields(user, input.fields) : user;

      logger.info('User retrieved successfully', {
        targetUserId: input.userId,
        requestingUserId: input.requestingUserId,
        fields: input.fields
      });

      return {
        user: filteredUser,
        success: true,
        message: 'User retrieved successfully'
      };

    } catch (error) {
      logger.error('Failed to get user', { userId: input.userId, requestingUserId: input.requestingUserId, error });
      return {
        user: null,
        success: false,
        message: 'Failed to retrieve user'
      };
    }
  }

  /**
   * Check if requesting user can access target user data
   */
  private checkAccessPermission(targetUser: User, requestingUserId?: string): { allowed: boolean; reason?: string } {
    // Users can always access their own data
    if (requestingUserId && requestingUserId === targetUser.id) {
      return { allowed: true };
    }

    // Check business rules for accessing other users' data
    const canSearch = UserPolicies.canSearchUsers(targetUser, { id: requestingUserId });
    return canSearch;
  }

  /**
   * Filter user fields based on requested fields
   */
  private filterUserFields(user: User, requestedFields: string[]): User {
    const pick = <T extends Record<string, any>>(source: T, fields: string[]) => {
      const result: Partial<T> = {};
      for (const field of fields) {
        if (field in source) {
          (result as any)[field] = source[field];
        }
      }
      return result;
    };

    const filtered = pick(user as any, requestedFields);
    return filtered as User;
  }
}
