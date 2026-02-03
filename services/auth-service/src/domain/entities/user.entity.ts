/**
 * User Entity for Auth Service
 * Represents a user in the authentication system
 */

import { UserRole, UserStatus, AuthUser } from './user.types';

export class UserEntity implements AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;
  avatar?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<AuthUser>) {
    this.id = data.id || this.generateId();
    this.email = data.email || '';
    this.name = data.name || '';
    this.role = data.role || UserRole.BUYER;
    this.status = data.status || UserStatus.PENDING_VERIFICATION;
    this.isEmailVerified = data.isEmailVerified || false;
    this.isPhoneVerified = data.isPhoneVerified || false;
    this.twoFactorEnabled = data.twoFactorEnabled || false;
    this.twoFactorSecret = data.twoFactorSecret;
    this.failedLoginAttempts = data.failedLoginAttempts || 0;
    this.lockoutUntil = data.lockoutUntil;
    this.lastLoginAt = data.lastLoginAt;
    this.avatar = data.avatar;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Generate a unique user ID
   */
  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if user account is locked
   */
  isLocked(): boolean {
    if (!this.lockoutUntil) return false;
    return new Date() < this.lockoutUntil;
  }

  /**
   * Increment failed login attempts
   */
  incrementFailedAttempts(): void {
    this.failedLoginAttempts++;
    this.updatedAt = new Date();
  }

  /**
   * Reset failed login attempts
   */
  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockoutUntil = undefined;
    this.updatedAt = new Date();
  }

  /**
   * Lock user account for a specified duration (in milliseconds)
   */
  lockAccount(duration: number): void {
    this.lockoutUntil = new Date(Date.now() + duration);
    this.updatedAt = new Date();
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin(): void {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Verify email address
   */
  verifyEmail(): void {
    this.isEmailVerified = true;
    this.updatedAt = new Date();
  }

  /**
   * Verify phone number
   */
  verifyPhone(): void {
    this.isPhoneVerified = true;
    this.updatedAt = new Date();
  }

  /**
   * Enable two-factor authentication
   */
  enableTwoFactor(secret: string): void {
    this.twoFactorEnabled = true;
    this.twoFactorSecret = secret;
    this.updatedAt = new Date();
  }

  /**
   * Disable two-factor authentication
   */
  disableTwoFactor(): void {
    this.twoFactorEnabled = false;
    this.twoFactorSecret = undefined;
    this.updatedAt = new Date();
  }

  /**
   * Update user status
   */
  updateStatus(status: UserStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Check if user has required role
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Check if user is active and can authenticate
   */
  canAuthenticate(): boolean {
    return this.status === UserStatus.ACTIVE && !this.isLocked();
  }

  /**
   * Get user roles for authorization
   */
  getRoles(): UserRole[] {
    return [this.role];
  }

  /**
   * Get user permissions based on role
   */
  getPermissions(): string[] {
    switch (this.role) {
      case UserRole.BUYER:
        return ['read:products', 'read:categories', 'create:orders', 'read:orders'];
      case UserRole.SELLER:
        return ['read:products', 'create:products', 'update:products', 'delete:products', 'read:orders', 'update:orders'];
      case UserRole.COURIER:
        return ['read:orders', 'update:orders', 'read:deliveries'];
      case UserRole.SUPPLIER:
        return ['read:products', 'update:products', 'read:inventory', 'update:inventory'];
      case UserRole.ENABLER:
        return ['read:products', 'read:orders', 'read:users', 'read:analytics'];
      case UserRole.SYSTEM:
        return ['*'];
      default:
        return [];
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const userPermissions = this.getPermissions();
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  /**
   * Get user context for authentication
   */
  toAuthContext(): AuthUser {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      status: this.status,
      isEmailVerified: this.isEmailVerified,
      isPhoneVerified: this.isPhoneVerified,
      twoFactorEnabled: this.twoFactorEnabled,
      twoFactorSecret: this.twoFactorSecret,
      failedLoginAttempts: this.failedLoginAttempts,
      lockoutUntil: this.lockoutUntil,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}