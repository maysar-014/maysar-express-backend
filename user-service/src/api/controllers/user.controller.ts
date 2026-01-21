import { Request, Response, NextFunction } from 'express';
import { CreateUserUseCase, CreateUserInput, CreateUserOutput } from '../../application/use-cases/create-user.use-case';
import { GetUserUseCase, GetUserInput, GetUserOutput } from '../../application/use-cases/get-user.use-case';
import { UpdateUserUseCase, UpdateUserInput, UpdateUserOutput } from '../../application/use-cases/update-user.use-case';
import { VerifyEmailUseCase, VerifyEmailInput, VerifyEmailOutput } from '../../application/use-cases/verify-email.use-case';
import { SearchUsersUseCase, SearchUsersInput, SearchUsersOutput } from '../../application/use-cases/search-users.use-case';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { UserEventPublisher } from '../../infrastructure/messaging/user-event-publisher';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * User Controller
 * Handles HTTP requests for user management operations
 */
export class UserController {
  private createUserUseCase: CreateUserUseCase;
  private getUserUseCase: GetUserUseCase;
  private updateUserUseCase: UpdateUserUseCase;
  private verifyEmailUseCase: VerifyEmailUseCase;
  private searchUsersUseCase: SearchUsersUseCase;

  constructor() {
    const userRepository = new PrismaUserRepository(null as any); // TODO: Inject Prisma client
    const eventPublisher = new UserEventPublisher();

    this.createUserUseCase = new CreateUserUseCase(userRepository, eventPublisher);
    this.getUserUseCase = new GetUserUseCase(userRepository);
    this.updateUserUseCase = new UpdateUserUseCase(userRepository, eventPublisher);
    this.verifyEmailUseCase = new VerifyEmailUseCase(userRepository, eventPublisher);
    this.searchUsersUseCase = new SearchUsersUseCase(userRepository);
  }

  /**
   * Create a new user
   * POST /api/v1/users
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateUserInput = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phoneNumber: req.body.phoneNumber,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        role: req.body.role
      };

      const result: CreateUserOutput = await this.createUserUseCase.execute(input);

      if (result.success) {
        logger.info('User created successfully via API', {
          userId: result.user.id,
          email: result.user.email.toString()
        });

        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            user: this.mapUserToResponse(result.user),
            userId: result.user.id
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:userId
   */
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: GetUserInput = {
        userId: req.params.userId,
        requestingUserId: (req as any).userId,
        fields: req.query.fields ? (req.query.fields as string).split(',') : undefined
      };

      const result: GetUserOutput = await this.getUserUseCase.execute(input);

      if (result.success && result.user) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: this.mapUserToResponse(result.user)
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/v1/users/:userId
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: UpdateUserInput = {
        userId: req.params.userId,
        updates: req.body,
        updatedBy: (req as any).userId || req.params.userId // Default to self-update if no auth
      };

      const result: UpdateUserOutput = await this.updateUserUseCase.execute(input);

      if (result.success && result.user) {
        logger.info('User updated successfully via API', {
          userId: result.user.id,
          updatedBy: input.updatedBy,
          changes: result.changes
        });

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: this.mapUserToResponse(result.user),
            changes: result.changes
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify user email
   * POST /api/v1/users/:userId/verify-email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: VerifyEmailInput = {
        userId: req.params.userId,
        verificationToken: req.body.verificationToken,
        verifiedBy: (req as any).userId // Admin verification
      };

      const result: VerifyEmailOutput = await this.verifyEmailUseCase.execute(input);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            emailVerified: result.emailVerified,
            verificationMethod: result.verificationMethod
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {
            emailVerified: false
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users
   * GET /api/v1/users/search
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: SearchUsersInput = {
        filters: {
          query: req.query.query as string,
          role: req.query.role as string,
          status: req.query.status as string,
          emailVerified: req.query.emailVerified ? req.query.emailVerified === 'true' : undefined,
          phoneVerified: req.query.phoneVerified ? req.query.phoneVerified === 'true' : undefined,
          createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
          createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined
        },
        pagination: {
          page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
          sortBy: req.query.sortBy as any,
          sortOrder: req.query.sortOrder as any
        },
        requestingUserId: (req as any).userId
      };

      const result: SearchUsersOutput = await this.searchUsersUseCase.execute(input);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            users: result.users.map(user => this.mapUserToResponse(user)),
            pagination: result.pagination
          }
        });
      } else {
        res.status(result.pagination.total === 0 ? 404 : 403).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (admin only)
   * DELETE /api/v1/users/:userId
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const requestingUserId = (req as any).userId;

      // Check if user exists first
      const user = await this.getUserUseCase.execute({
        userId,
        requestingUserId
      });

      if (!user.success || !user.user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // In a real implementation, we'd have a DeleteUserUseCase
      // For now, we'll use the repository directly
      const userRepository = new PrismaUserRepository(null as any);
      await userRepository.delete(userId);

      logger.info('User deleted via API', {
        userId,
        deletedBy: requestingUserId
      });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRepository = new PrismaUserRepository(null as any);
      const stats = await userRepository.getUserCountByStatus();

      res.status(200).json({
        success: true,
        data: {
          userStats: stats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Map domain user to API response format
   */
  private mapUserToResponse(user: any): any {
    return {
      id: user.id,
      email: user.email.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber?.toString(),
      dateOfBirth: user.dateOfBirth,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

// Export singleton instance
export const userController = new UserController();
