import { UserRole, UserStatus, AuthUser } from '../entities/user.types';

/**
 * AUTH SERVICE - REPOSITORY INTERFACES
 *
 * The Auth Service no longer manages user entities directly.
 * User management is now handled by the User Service.
 *
 * This file contains only the repository interfaces needed for authentication.
 */

/**
 * User Repository Interface - Minimal for Auth Service
 * This is a compatibility layer during the transition to User Service
 */
export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<AuthUser | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<AuthUser | null>;

  /**
   * Save user state changes (for auth operations)
   */
  save(user: AuthUser): Promise<void>;

  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;
}

/**
 * Session Repository Interface
 * Manages user sessions and tokens
 */
export interface ISessionRepository {
  /**
   * Create new session
   */
  create(session: {
    id: string;
    userId: string;
    token: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Find session by token
   */
  findByToken(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    expiresAt: Date;
  } | null>;

  /**
   * Find sessions by user ID
   */
  findByUserId(userId: string): Promise<Array<{
    id: string;
    userId: string;
    token: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    expiresAt: Date;
  }>>;

  /**
   * Delete session by token
   */
  deleteByToken(token: string): Promise<void>;

  /**
   * Delete all sessions for user
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Update session expiration
   */
  updateExpiresAt(token: string, expiresAt: Date): Promise<void>;

  /**
   * Delete expired sessions
   */
  deleteExpired(): Promise<number>;

  /**
   * Count active sessions for user
   */
  countActiveSessions(userId: string): Promise<number>;
}

/**
 * Password Reset Token Repository Interface
 */
export interface IPasswordResetRepository {
  /**
   * Create password reset token
   */
  create(token: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Find by token
   */
  findByToken(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    used: boolean;
  } | null>;

  /**
   * Mark token as used
   */
  markAsUsed(tokenId: string): Promise<void>;

  /**
   * Delete expired tokens
   */
  deleteExpired(): Promise<number>;
}

/**
 * Email Verification Token Repository Interface
 */
export interface IEmailVerificationRepository {
  /**
   * Create email verification token
   */
  create(token: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Find by token
   */
  findByToken(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    used: boolean;
  } | null>;

  /**
   * Mark token as used
   */
  markAsUsed(tokenId: string): Promise<void>;

  /**
   * Delete expired tokens
   */
  deleteExpired(): Promise<number>;
}

/**
 * Audit Log Repository Interface
 * For security and compliance logging
 */
export interface IAuditRepository {
  /**
   * Log authentication event
   */
  logAuthentication(event: {
    userId?: string;
    email?: string;
    action: 'login_success' | 'login_failure' | 'logout' | 'password_change' | 'password_reset' | 'account_lock' | 'account_unlock' | 'suspicious_activity';
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<void>;

  /**
   * Log user management event
   */
  logUserManagement(event: {
    adminId: string;
    targetUserId: string;
    action: 'user_created' | 'user_updated' | 'user_deleted' | 'role_changed' | 'status_changed';
    oldValue?: any;
    newValue?: any;
    reason?: string;
  }): Promise<void>;

  /**
   * Get audit logs for user
   */
  getUserAuditLogs(userId: string, limit?: number): Promise<Array<{
    id: string;
    timestamp: Date;
    action: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    metadata?: Record<string, any>;
  }>>;

  /**
   * Get security events
   */
  getSecurityEvents(hours?: number): Promise<Array<{
    id: string;
    timestamp: Date;
    userId?: string;
    email?: string;
    action: string;
    ipAddress: string;
    success: boolean;
    reason?: string;
  }>>;
}
