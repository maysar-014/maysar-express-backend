import { UserRole } from '../entities/user.entity';
import { AuthenticationPolicy } from '../policies/authentication.policy';

/**
 * Session Data Interface
 * Represents session information stored and managed by the Auth Service
 */
export interface SessionData {
  userId: string;
  role: string;
  permissions: string[];
  lastActivity: Date;
  deviceInfo: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Session Validation Result
 */
export interface SessionResult {
  valid: boolean;
  session?: SessionData;
  expiresIn?: number;
  refreshRequired?: boolean;
  message?: string;
}

/**
 * Session Engine - Updated for User Service separation
 * Manages user sessions with Redis while coordinating with User Service
 */
export class SessionEngine {
  private readonly SESSION_TTL = 3600; // 1 hour
  private readonly REFRESH_THRESHOLD = 300; // 5 minutes

  // In-memory session store for demo (replace with Redis in production)
  private sessions = new Map<string, SessionData>();
  private userSessions = new Map<string, Set<string>>();

  /**
   * Creates a new session for authenticated user
   */
  async createSession(userId: string, role: string, deviceInfo: string, ipAddress: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const permissions = this.getPermissionsForRole(role as UserRole);

    const sessionData: SessionData = {
      userId,
      role,
      permissions,
      lastActivity: new Date(),
      deviceInfo,
      ipAddress,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TTL * 1000)
    };

    // Store session
    this.sessions.set(sessionId, sessionData);

    // Track user sessions for cleanup
    this.addUserSession(userId, sessionId);

    // Clean up expired sessions periodically
    this.cleanupExpiredSessions();

    return sessionId;
  }

  /**
   * Validates an existing session
   */
  async validateSession(sessionId: string): Promise<SessionResult> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, message: 'Session not found' };
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      this.removeUserSession(session.userId, sessionId);
      return { valid: false, message: 'Session expired' };
    }

    // Update last activity
    session.lastActivity = new Date();

    const expiresIn = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    const refreshRequired = expiresIn < this.REFRESH_THRESHOLD;

    return {
      valid: true,
      session,
      expiresIn,
      refreshRequired
    };
  }

  /**
   * Refreshes session expiration time
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Extend expiration
    session.expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000);

    return true;
  }

  /**
   * Terminates a specific session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      this.sessions.delete(sessionId);
      this.removeUserSession(session.userId, sessionId);
    }
  }

  /**
   * Terminates all sessions for a user
   */
  async terminateAllUserSessions(userId: string): Promise<void> {
    const userSessionIds = this.userSessions.get(userId);

    if (userSessionIds) {
      // Remove all user sessions
      userSessionIds.forEach(sessionId => {
        this.sessions.delete(sessionId);
      });

      this.userSessions.delete(userId);
    }
  }

  /**
   * Gets all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = this.userSessions.get(userId) || new Set<string>();
    const userSessions: SessionData[] = [];

    sessionIds.forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session) {
        userSessions.push(session);
      }
    });

    return userSessions;
  }

  /**
   * Counts active sessions for a user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    const sessionIds = this.userSessions.get(userId);
    return sessionIds ? sessionIds.size : 0;
  }

  /**
   * Validates session with additional security checks
   */
  async validateSessionWithSecurity(
    sessionId: string,
    clientInfo: { ip: string; userAgent: string }
  ): Promise<SessionResult> {
    const result = await this.validateSession(sessionId);

    if (!result.valid || !result.session) {
      return result;
    }

    // Additional security checks can be added here
    // For example, IP address changes, suspicious activity detection

    return result;
  }

  // Private helper methods

  /**
   * Adds session to user's session tracking
   */
  private addUserSession(userId: string, sessionId: string): void {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set<string>());
    }

    const userSessions = this.userSessions.get(userId)!;
    userSessions.add(sessionId);

    // Enforce session limits per user
    const limits = AuthenticationPolicy.getAuthenticationLimits(userId as UserRole);
    if (userSessions.size > limits.maxSessions) {
      // Remove oldest sessions (simplified - in production, use LRU or time-based)
      const sessionsToRemove = Array.from(userSessions).slice(0, userSessions.size - limits.maxSessions);
      sessionsToRemove.forEach(sessionId => {
        this.sessions.delete(sessionId);
        userSessions.delete(sessionId);
      });
    }
  }

  /**
   * Removes session from user's session tracking
   */
  private removeUserSession(userId: string, sessionId: string): void {
    const userSessions = this.userSessions.get(userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(userId);
      }
    }
  }

  /**
   * Generates unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets permissions for a user role
   */
  private getPermissionsForRole(role: UserRole): string[] {
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ['*'],
      [UserRole.USER]: ['manage_own_profile'],
      [UserRole.MODERATOR]: ['manage_users', 'manage_own_profile'],
      [UserRole.GUEST]: ['view_products'],
      [UserRole.BUYER]: ['view_products', 'create_orders', 'view_own_orders', 'manage_own_profile'],
      [UserRole.SELLER]: ['manage_products', 'view_orders', 'update_inventory', 'manage_own_profile', 'view_analytics'],
      [UserRole.COURIER]: ['view_deliveries', 'update_delivery_status', 'manage_own_profile'],
      [UserRole.SUPPLIER]: ['manage_bulk_orders', 'view_production', 'manage_own_profile'],
      [UserRole.ENABLER]: ['manage_users', 'view_system_analytics', 'manage_own_profile', 'system_admin'],
      [UserRole.SYSTEM]: ['*'] // Full access
    };

    return rolePermissions[role] || [];
  }

  /**
   * Cleans up expired sessions periodically
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessionIds: string[] = [];

    // Find expired sessions
    this.sessions.forEach((session, sessionId) => {
      if (session.expiresAt < now) {
        expiredSessionIds.push(sessionId);
      }
    });

    // Remove expired sessions
    expiredSessionIds.forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.removeUserSession(session.userId, sessionId);
        this.sessions.delete(sessionId);
      }
    });
  }
}
