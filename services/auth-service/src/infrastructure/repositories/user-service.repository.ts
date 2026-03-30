import { AuthUser, UserRole, UserStatus } from '../../domain/entities/user.types';
import { IUserRepository } from '../../domain/repositories';
import { UserServiceClient } from '../clients/user-service.client';
import { logger } from '../services/logger.service';
import axios from 'axios';
import { getServiceBaseUrl } from '../../../../../shared/config/service-base-url';

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

      if (!userData) return null;

      const mapped = this.mapToAuthUser(userData);
      return mapped;
    } catch (error) {
      logger.error('Failed to find user by ID via User Service', { userId: id, error });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<AuthUser | null> {
    const normalizedEmail = email.toLowerCase();
    logger.debug('Finding user by email via User Service', { email: normalizedEmail });

    let userData: any | null = null;
    try {
      userData = await this.userServiceClient.findUserByEmail(normalizedEmail);
    } catch (error) {
      logger.warn?.('Primary user lookup failed, falling back to HTTP lookup', {
        email: normalizedEmail,
        message: (error as Error)?.message
      });
    }

    if (userData) {
      return this.mapToAuthUser(userData);
    }

    // Fallback: use internal lookup endpoint for parity with user-service routes
    const fallback = await this.lookupUserByEmail(normalizedEmail);
    if (fallback) {
      return this.mapResponseToAuthUser(fallback);
    }

    return null;
  }

  /**
   * Save user state changes (for auth operations like login attempts)
   */
  async save(user: AuthUser | any): Promise<void> {
    try {
      // Registration flow stores User entity-like payloads.
      if (this.looksLikeRegistrationUser(user)) {
        const authUser = this.mapRegistrationUserToAuthUser(user);
        const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
        const phoneNumber = profile.phoneNumber || profile.phone || profile.mobile;
        let firstName = profile.firstName;
        let lastName = profile.lastName;

        if ((!firstName || !lastName) && typeof profile.name === 'string') {
          const parts = profile.name.trim().split(/\s+/);
          if (!firstName && parts[0]) firstName = parts[0];
          if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ');
        }

        if (!phoneNumber) {
          throw new Error('Phone number is required for registration');
        }
        if (!firstName || !lastName) {
          throw new Error('First and last name are required for registration');
        }

        if (typeof this.userServiceClient.createUser === 'function') {
          await this.userServiceClient.createUser({
            email: authUser.email,
            password: 'TempPassword123!',
            role: authUser.role,
            phoneNumber,
            firstName,
            lastName
          });
          return;
        }

        throw new Error('User Service client does not support createUser');
      }

      const authUser = user as AuthUser;
      logger.debug('Saving user auth state via User Service', { userId: authUser.id });

      // For auth operations, we only need to update login-related fields
      const updates: any = {};

      // These fields are managed by auth service and need to be synced
      if (authUser.failedLoginAttempts !== undefined) {
        updates.failedLoginAttempts = authUser.failedLoginAttempts;
      }
      if (authUser.lockoutUntil !== undefined) {
        updates.lockoutUntil = authUser.lockoutUntil?.toISOString();
      }
      if (authUser.lastLoginAt !== undefined) {
        updates.lastLoginAt = authUser.lastLoginAt?.toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await this.userServiceClient.updateUser(authUser.id, updates);
        logger.info('User auth state saved via User Service', { userId: authUser.id });
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
    const normalizedEmail = email.toLowerCase();
    try {
      logger.debug('Checking email existence via User Service', { email: normalizedEmail });

      const exists = await this.userServiceClient.emailExists(normalizedEmail);

      logger.info('Email existence checked via User Service', { email: normalizedEmail, exists });

      return exists;
    } catch (error) {
      logger.error('Failed to check email existence via User Service', { email: normalizedEmail, error });
      throw error;
    }
  }

  /**
   * Map User Service response to AuthUser
   */
  private mapToAuthUser(userData: any): AuthUser {
    const role = this.normalizeRole(userData.role);
    const status = this.normalizeStatus(userData.status);
    return {
      id: userData.id,
      publicCode: userData.publicCode,
      email: String(userData.email || '').toLowerCase(),
      role,
      status,
      isEmailVerified: userData.isEmailVerified || false,
      isPhoneVerified: userData.isPhoneVerified || false,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      twoFactorSecret: userData.twoFactorSecret,
      failedLoginAttempts: userData.failedLoginAttempts || 0,
      lockoutUntil: userData.lockoutUntil ? new Date(userData.lockoutUntil) : undefined,
      lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date()
    };
  }

  private async lookupUserByEmail(email: string): Promise<any | null> {
    try {
      const baseUrl = getServiceBaseUrl('user');
      const response = await axios.get(`${baseUrl}/lookup`, {
        params: { email },
        headers: { 'x-internal-call': 'auth-service' },
        timeout: 5000
      });

      const user = response?.data?.data?.user ?? null;
      return user;
    } catch (error: any) {
      logger.warn?.('User lookup fallback failed', {
        email,
        message: error?.message
      });
      return null;
    }
  }

  private mapResponseToAuthUser(userData: any): AuthUser {
    const role = this.normalizeRole(userData.role);
    const status = this.normalizeStatus(userData.status);
    const metadata = userData.metadata || {};
    return {
      id: userData.id,
      publicCode: userData.publicCode,
      email: String(userData.email || '').toLowerCase(),
      role,
      status,
      isEmailVerified: userData.emailVerified || false,
      isPhoneVerified: userData.phoneVerified || false,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      twoFactorSecret: userData.twoFactorSecret,
      failedLoginAttempts: metadata.loginAttempts || 0,
      lockoutUntil: metadata.accountLockedUntil ? new Date(metadata.accountLockedUntil) : undefined,
      lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date()
    };
  }

  private looksLikeRegistrationUser(user: any): boolean {
    return user && typeof user.id === 'string' && user.email !== undefined && user.profile !== undefined;
  }

  private mapRegistrationUserToAuthUser(user: any): AuthUser {
    const email = typeof user.email === 'string' ? user.email : user.email?.toString?.();
    const now = new Date();
    return {
      id: String(user.id),
      publicCode: user.publicCode,
      email: String(email || '').toLowerCase(),
      role: this.normalizeRole(user.role),
      status: this.normalizeStatus(user.status),
      isEmailVerified: true,
      isPhoneVerified: false,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      createdAt: user.createdAt ? new Date(user.createdAt) : now,
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : now,
      metadata: { profile: user.profile || {} }
    };
  }

  private normalizeRole(role: unknown): UserRole {
    const normalized = String(role || '').toLowerCase();
    const allRoles = Object.values(UserRole) as string[];
    return (allRoles.includes(normalized) ? normalized : UserRole.BUYER) as UserRole;
  }

  private normalizeStatus(status: unknown): UserStatus {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('deactivated')) return UserStatus.DEACTIVATED;
    if (normalized.includes('inactive')) return UserStatus.DEACTIVATED;
    if (normalized.includes('pending')) return UserStatus.PENDING_VERIFICATION;
    if (normalized.includes('suspended')) return UserStatus.SUSPENDED;
    if (normalized.includes('locked')) return UserStatus.LOCKED;
    if (normalized.includes('active')) return UserStatus.ACTIVE;
    return UserStatus.ACTIVE;
  }
}
