import { AuthUser, UserRole, UserStatus } from '../../domain/entities/user.types';
import { IUserRepository } from '../../domain/repositories';
import { UserServiceClient } from '../clients/user-service.client';
import { logger } from '../services/logger.service';

/**
 * User Service Repository Adapter
 * Implements IUserRepository interface using User Service HTTP client
 * This adapter allows the Auth Service to continue using the repository interface
 * while communicating with the separated User Service
 */
export class UserServiceRepository implements IUserRepository {
  constructor(private userServiceClient: UserServiceClient) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<AuthUser | null> {
    try {
      logger.debug('Finding user by ID via User Service', { userId: id });

      const userData = await this.userServiceClient.findUserById(id);

      if (!userData) {
        return null;
      }

      return this.mapToAuthUser(userData);
    } catch (error) {
      logger.error('Failed to find user by ID via User Service', { userId: id, error });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<AuthUser | null> {
    try {
      logger.debug('Finding user by email via User Service', { email });

      const userData = await this.userServiceClient.findUserByEmail(email);

      if (!userData) {
        return null;
      }

      return this.mapToAuthUser(userData);
    } catch (error) {
      logger.error('Failed to find user by email via User Service', { email, error });
      throw error;
    }
  }

  /**
   * Save user state changes (for auth operations like login attempts)
   */
  async save(user: AuthUser): Promise<void> {
    try {
      logger.debug('Saving user auth state via User Service', { userId: user.id });

      // For auth operations, we only need to update login-related fields
      const updates: any = {};

      // These fields are managed by auth service and need to be synced
      if (user.failedLoginAttempts !== undefined) {
        updates.failedLoginAttempts = user.failedLoginAttempts;
      }
      if (user.lockoutUntil !== undefined) {
        updates.lockoutUntil = user.lockoutUntil?.toISOString();
      }
      if (user.lastLoginAt !== undefined) {
        updates.lastLoginAt = user.lastLoginAt?.toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await this.userServiceClient.updateUser(user.id, updates);
        logger.info('User auth state saved via User Service', { userId: user.id });
      }
    } catch (error) {
      logger.error('Failed to save user auth state via User Service', { userId: user.id, error });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      logger.debug('Checking email existence via User Service', { email });

      const exists = await this.userServiceClient.emailExists(email);

      logger.info('Email existence checked via User Service', { email, exists });

      return exists;
    } catch (error) {
      logger.error('Failed to check email existence via User Service', { email, error });
      // Return false on error for security (don't leak information)
      return false;
    }
  }

  /**
   * Map User Service response to AuthUser
   */
  private mapToAuthUser(userData: any): AuthUser {
    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      isEmailVerified: userData.isEmailVerified || false,
      isPhoneVerified: userData.isPhoneVerified || false,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      twoFactorSecret: userData.twoFactorSecret,
      failedLoginAttempts: userData.failedLoginAttempts || 0,
      lockoutUntil: userData.lockoutUntil ? new Date(userData.lockoutUntil) : undefined,
      lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined,
      createdAt: new Date(userData.createdAt),
      updatedAt: new Date(userData.updatedAt)
    };
  }
}
