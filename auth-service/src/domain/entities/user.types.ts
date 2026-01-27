/**
 * AUTH SERVICE - USER TYPES AND INTERFACES
 *
 * The Auth Service no longer manages user entities directly.
 * User management is now handled by the User Service.
 *
 * This file contains the minimal user types needed for authentication.
 * All user data operations go through the User Service via HTTP client.
 */

/**
 * User Roles - Defines access levels and permissions
 */
export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  COURIER = 'courier',
  SUPPLIER = 'supplier',
  ENABLER = 'enabler',
  SYSTEM = 'system'
}

/**
 * User Status - Defines account states
 */
export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  LOCKED = 'locked'
}

/**
 * AuthUser Interface - Minimal user representation for authentication
 * Contains only the fields needed for authentication operations
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string; // Full name for display purposes
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;
  avatar?: string; // User profile picture URL
  metadata?: Record<string, any>; // Additional user metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Service Response Types - Match User Service API responses
 */
export interface UserServiceUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  lockoutUntil?: string;
  passwordChangedAt?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication Request Types
 */
export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
  ipAddress: string;
  userAgent: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface PasswordResetRequest {
  email: string;
  resetToken: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  userId: string;
  verificationToken: string;
}

/**
 * Authentication Response Types
 */
export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  locked?: boolean;
  message: string;
}

export interface SessionInfo {
  userId: string;
  role: string;
  permissions: string[];
  expiresIn: number;
  refreshRequired?: boolean;
}
