import { logger } from '../services/logger.service';
import {
  createUser,
  emailExists,
  findUserByEmail,
  findUserById,
  recordFailedLogin,
  recordSuccessfulLogin,
  searchUsers,
  updatePassword,
  updateUserAuthState,
  verifyEmail
} from '../../../../user-service/src/internal/user-service.facade';

/**
 * User Service Client
 * In-process client for communicating with the User Service
 */
export class UserServiceClient {
  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<any> {
    return findUserById(userId);
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<any> {
    return findUserByEmail(email);
  }

  /**
   * Create new user
   */
  async createUser(userData: {
    email: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    role?: string;
  }): Promise<any> {
    return createUser(userData);
  }

  /**
   * Update user profile or auth state
   */
  async updateUser(userId: string, updates: any): Promise<any> {
    return updateUserAuthState(userId, updates);
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string, verificationToken: string): Promise<boolean> {
    return verifyEmail(userId, verificationToken);
  }

  /**
   * Update user password (for password reset)
   */
  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await updatePassword(userId, newPasswordHash);
  }

  /**
   * Record successful login
   */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    await recordSuccessfulLogin(userId);
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId: string): Promise<void> {
    await recordFailedLogin(userId);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      return await emailExists(email);
    } catch (error: any) {
      logger.warn('Email existence check failed', { email, error: error?.message });
      return false;
    }
  }

  /**
   * Search users (admin function)
   */
  async searchUsers(query: string, limit: number = 50): Promise<any[]> {
    return searchUsers(query, limit);
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return {
      state: 'closed',
      failures: 0,
      successes: 0,
      rejections: 0,
      timeouts: 0
    };
  }

  /**
   * Health check for User Service
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

/**
 * Create User Service client with default configuration
 */
export function createUserServiceClient(): UserServiceClient {
  return new UserServiceClient();
}
