import { User, UserRole } from '../../domain/entities/user.entity';
import { UserPreferences } from '../../domain/types/user.types';
import { Address } from '../../domain/value-objects/address.value-object';
import { IUserRepository } from '../../domain/repositories';
import { UserPolicies } from '../../domain/policies/user-policies';
import { UserProfileUpdatedEvent, IDomainEventPublisher } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Input for updating a user
 */
export interface UpdateUserInput {
  userId: string;
  updates: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
    avatar?: string;
    language?: string;
    timezone?: string;
    notificationsEnabled?: boolean;
    addresses?: any[];
  };
  updatedBy: string; // User performing the update
}

/**
 * Output from updating a user
 */
export interface UpdateUserOutput {
  user: User;
  success: boolean;
  message: string;
  changes?: string[];
}

/**
 * Use case for updating user profile information
 * Handles profile updates with authorization and business rules
 */
export class UpdateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private eventPublisher: IDomainEventPublisher
  ) {}

  /**
   * Execute the update user use case
   */
  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    try {
      logger.info('Starting user update', {
        targetUserId: input.userId,
        updatedBy: input.updatedBy,
        fields: Object.keys(input.updates)
      });

      // Find the user
      let user = await this.userRepository.findById(input.userId);
      if (!user) {
        return {
          user: null as any,
          success: false,
          message: 'User not found'
        };
      }

      // Authorization check - can the updater modify this user?
      const canUpdate = await this.checkUpdatePermission(user, input.updatedBy);
      if (!canUpdate.allowed) {
        return {
          user: null as any,
          success: false,
          message: canUpdate.reason || 'Permission denied'
        };
      }

      // Validate business rules for the updates
      const validationResult = UserPolicies.canUpdateProfile(user, input.updates);
      if (!validationResult.allowed) {
        return {
          user: null as any,
          success: false,
          message: validationResult.reason || 'Update not allowed'
        };
      }


      // Track changes for auditing
      const oldValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      const changes: string[] = [];

      // Apply profile updates
      if (input.updates.firstName !== undefined && input.updates.firstName !== user.firstName) {
        oldValues.firstName = user.firstName;
        newValues.firstName = input.updates.firstName;
        changes.push('firstName');
        user = user.updateProfile({ firstName: input.updates.firstName });
      }

      if (input.updates.lastName !== undefined && input.updates.lastName !== user.lastName) {
        oldValues.lastName = user.lastName;
        newValues.lastName = input.updates.lastName;
        changes.push('lastName');
        user = user.updateProfile({ lastName: input.updates.lastName });
      }

      if (input.updates.dateOfBirth !== undefined) {
        const newDob = new Date(input.updates.dateOfBirth);
        if (user.dateOfBirth?.getTime() !== newDob.getTime()) {
          oldValues.dateOfBirth = user.dateOfBirth;
          newValues.dateOfBirth = newDob;
          changes.push('dateOfBirth');
          user = user.updateProfile({ dateOfBirth: newDob });
        }
      }


      if (input.updates.addresses !== undefined && Array.isArray(input.updates.addresses)) {
        oldValues.addresses = user.addresses;
        const newAddressList: Address[] = input.updates.addresses.map((addrInput: any) => {
          if (addrInput instanceof Address) {
            return addrInput;
          }
          const typeCandidate = addrInput.type === 'work' ? 'business' : (addrInput.type || 'home');
          return Address.create({
            id: addrInput.id,
            userId: user!.id,
            type: typeCandidate as 'billing' | 'shipping' | 'business' | 'home',
            isPrimary: addrInput.isPrimary ?? addrInput.isDefault ?? false,
            street: addrInput.street || '',
            // Tanzania canonical fields — pass through if present
            ward: addrInput.ward || undefined,
            district: addrInput.district || undefined,
            region: addrInput.region || undefined,
            // Legacy city — only set if explicitly provided (empty string means absent)
            city: addrInput.city || undefined,
            state: addrInput.state,
            postalCode: addrInput.postalCode || '',
            country: addrInput.country || 'Tanzania',
            coordinates: addrInput.coordinates,
            createdAt: addrInput.createdAt || new Date(),
            updatedAt: addrInput.updatedAt || new Date()
          });
        });
        newValues.addresses = newAddressList;
        changes.push('addresses');
        user = user.updateProfile({ addresses: newAddressList });
      }

      // Update preferences if provided
      if (input.updates.language !== undefined ||
          input.updates.timezone !== undefined ||
          input.updates.notificationsEnabled !== undefined) {

        const currentPrefs = await this.userRepository.getUserPreferences(user.id);
        const updatedPrefs: Partial<UserPreferences> = {};

        if (input.updates.language !== undefined && input.updates.language !== currentPrefs.language) {
          oldValues.language = currentPrefs.language;
          newValues.language = input.updates.language;
          updatedPrefs.language = input.updates.language;
        }
        if (input.updates.timezone !== undefined && input.updates.timezone !== currentPrefs.timezone) {
          oldValues.timezone = currentPrefs.timezone;
          newValues.timezone = input.updates.timezone;
          updatedPrefs.timezone = input.updates.timezone;
        }

        if (Object.keys(updatedPrefs).length > 0) {
          await this.userRepository.updateUserPreferences(user.id, updatedPrefs);
          changes.push('preferences');
        }
      }

      // Save the updated user
      const updatedUser = await this.userRepository.update(user);

      // Publish domain event if there were changes
      if (changes.length > 0) {
        const profileUpdatedEvent = new UserProfileUpdatedEvent(
          user.id,
          changes,
          oldValues,
          newValues,
          input.updatedBy
        );

        await this.eventPublisher.publish(profileUpdatedEvent);
      }

      logger.info('User updated successfully', {
        targetUserId: input.userId,
        updatedBy: input.updatedBy,
        changes: changes
      });

      return {
        user: updatedUser,
        success: true,
        message: 'User profile updated successfully',
        changes: changes
      };

    } catch (error) {
      logger.error('Failed to update user', {
        userId: input.userId,
        updatedBy: input.updatedBy,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        user: null as any,
        success: false,
        message: 'Failed to update user profile'
      };
    }
  }

  /**
   * Check if the requesting user can update the target user
   */
  private async checkUpdatePermission(targetUser: User, requestingUserId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Users can update their own profiles
    if (targetUser.id === requestingUserId) {
      return { allowed: true };
    }

    // System admins can update any user
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (requestingUser?.role === UserRole.SYSTEM) {
      return { allowed: true };
    }

    // Enablers can update users in certain roles
    if (requestingUser?.role === UserRole.ENABLER) {
      const allowedRoles = [UserRole.BUYER, UserRole.SELLER, UserRole.COURIER];
      if (allowedRoles.includes(targetUser.role)) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'Insufficient permissions to update this user' };
  }
}
