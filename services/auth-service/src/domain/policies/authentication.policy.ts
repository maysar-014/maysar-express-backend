import { User, UserRole, UserStatus } from '../entities/user.entity';

/**
 * Authentication Policy - Allow/deny decisions for authentication operations
 * Contains all business rules for authentication permissions and access control
 */
export class AuthenticationPolicy {
  private static normalizeRole(role: UserRole | string): UserRole {
    const normalizedRole = String(role).toUpperCase();
    const matchedRole = Object.values(UserRole).find((value) => value === normalizedRole);
    return (matchedRole as UserRole) ?? UserRole.USER;
  }
  /**
   * Determines if a user role can perform authentication operations
   */
  static canAuthenticate(user: User): boolean {
    // All active users can attempt authentication
    return user.canAuthenticate();
  }

  /**
   * Determines if a user can change their password
   * Note: Password changes now go through User Service
   */
  static canChangePassword(user: User): boolean {
    return user.canChangePassword();
  }

  /**
   * Determines if a user can reset their password
   */
  static canResetPassword(user: User): boolean {
    // Password reset is allowed for active and suspended users
    // Note: Password reset now coordinated with User Service
    return user.status === UserStatus.ACTIVE ||
           user.status === UserStatus.SUSPENDED;
  }

  /**
   * Determines if a user can enable two-factor authentication
   * Note: 2FA settings now managed by User Service
   */
  static canEnableTwoFactor(user: User): boolean {
    // Only verified users can enable 2FA
    return user.status === UserStatus.ACTIVE && user.isVerified();
  }

  /**
   * Determines if a user can update their profile
   * Note: Profile updates now go through User Service
   */
  static canUpdateOwnProfile(user: User): boolean {
    return user.status === UserStatus.ACTIVE;
  }

  /**
   * Determines if a user can verify their email
   * Note: Email verification now handled by User Service
   */
  static canVerifyEmail(user: User): boolean {
    return user.status === UserStatus.ACTIVE ||
           user.status === UserStatus.PENDING_VERIFICATION;
  }

  /**
   * Determines if a user can verify their phone
   * Note: Phone verification now handled by User Service
   */
  static canVerifyPhone(user: User): boolean {
    return user.status === UserStatus.ACTIVE;
  }

  /**
   * Determines if a user can access admin features
   */
  static canAccessAdminFeatures(user: User): boolean {
    const role = this.normalizeRole(user.role);
    return role === UserRole.SYSTEM ||
           role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can manage other users
   */
  static canManageUsers(manager: User, target: User): boolean {
    // Only system and enabler roles can manage users
    const managerRole = this.normalizeRole(manager.role);
    const targetRole = this.normalizeRole(target.role);

    if (managerRole !== UserRole.SYSTEM && managerRole !== UserRole.ENABLER) {
      return false;
    }

    // Cannot manage system users
    if (targetRole === UserRole.SYSTEM) {
      return false;
    }

    // Enablers cannot manage other enablers
    if (managerRole === UserRole.ENABLER && targetRole === UserRole.ENABLER) {
      return false;
    }

    return true;
  }

  /**
   * Determines if a user can view another user's profile
   */
  static canViewUserProfile(viewer: User, target: User): boolean {
    const viewerRole = this.normalizeRole(viewer.role);
    const targetRole = this.normalizeRole(target.role);

    // System users can view all profiles
    if (viewerRole === UserRole.SYSTEM) {
      return true;
    }

    // Enablers can view all non-system profiles
    if (viewerRole === UserRole.ENABLER && targetRole !== UserRole.SYSTEM) {
      return true;
    }

    // Users can view their own profile
    if (viewer.id === target.id) {
      return true;
    }

    // Active users can view other active users' public information
    return viewer.status === UserStatus.ACTIVE && target.status === UserStatus.ACTIVE;
  }

  /**
   * Determines if a user can update another user's profile
   */
  static canUpdateUserProfile(updater: User, target: User): boolean {
    const updaterRole = this.normalizeRole(updater.role);
    const targetRole = this.normalizeRole(target.role);

    // Users can update their own profile
    if (updater.id === target.id) {
      return true;
    }

    // System and enabler roles can update other users
    return (updaterRole === UserRole.SYSTEM || updaterRole === UserRole.ENABLER) &&
           targetRole !== UserRole.SYSTEM;
  }

  /**
   * Determines if a user can delete another user
   */
  static canDeleteUser(deleter: User, target: User): boolean {
    const deleterRole = this.normalizeRole(deleter.role);
    const targetRole = this.normalizeRole(target.role);

    // Cannot delete system users
    if (targetRole === UserRole.SYSTEM) {
      return false;
    }

    // Only system users can delete other users
    return deleterRole === UserRole.SYSTEM;
  }

  /**
   * Determines if a user can access system features
   */
  static canAccessSystemFeatures(user: User): boolean {
    return user.canAccessSystem();
  }

  /**
   * Determines if a user can perform bulk operations
   */
  static canPerformBulkOperations(user: User): boolean {
    const role = this.normalizeRole(user.role);
    return role === UserRole.SYSTEM || role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can export data
   */
  static canExportData(user: User): boolean {
    const role = this.normalizeRole(user.role);
    return role === UserRole.SYSTEM || role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can access audit logs
   */
  static canAccessAuditLogs(user: User): boolean {
    const role = this.normalizeRole(user.role);
    return role === UserRole.SYSTEM || role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can configure system settings
   */
  static canConfigureSystem(user: User): boolean {
    return this.normalizeRole(user.role) === UserRole.SYSTEM;
  }

  /**
   * Determines if a user can send system notifications
   */
  static canSendSystemNotifications(user: User): boolean {
    const role = this.normalizeRole(user.role);
    return role === UserRole.SYSTEM || role === UserRole.ENABLER;
  }

  /**
   * Determines role hierarchy for permission checking
   */
  static getRoleHierarchy(): Record<string, number> {
    return {
      [UserRole.ADMIN]: 0,
      [UserRole.USER]: 0,
      [UserRole.MODERATOR]: 0,
      [UserRole.GUEST]: 0,
      [UserRole.BUYER]: 1,
      [UserRole.SELLER]: 2,
      [UserRole.SUPPLIER]: 3,
      [UserRole.COURIER]: 4,
      [UserRole.ENABLER]: 5,
      [UserRole.SYSTEM]: 6
    };
  }

  /**
   * Checks if one role has higher or equal permissions than another
   */
  static hasHigherOrEqualRole(userRole: UserRole | string, requiredRole: UserRole | string): boolean {
    const hierarchy = this.getRoleHierarchy();
    const normalizedUserRole = this.normalizeRole(userRole);
    const normalizedRequiredRole = this.normalizeRole(requiredRole);
    return hierarchy[normalizedUserRole] >= hierarchy[normalizedRequiredRole];
  }

  /**
   * Gets all allowed roles for a given user role
   */
  static getAllowedRolesFor(userRole: UserRole | string): UserRole[] {
    const hierarchy = this.getRoleHierarchy();
    const userLevel = hierarchy[this.normalizeRole(userRole)];

    return Object.entries(hierarchy)
      .filter(([, level]) => level <= userLevel)
      .map(([role]) => role as UserRole);
  }

  /**
   * Determines if a role transition is allowed
   */
  static canChangeUserRole(changer: User, target: User, newRole: UserRole | string): boolean {
    // Only system users can change roles
    const changerRole = this.normalizeRole(changer.role);
    const targetRole = this.normalizeRole(target.role);

    if (changerRole !== UserRole.SYSTEM) {
      return false;
    }

    // Cannot change system user roles
    if (targetRole === UserRole.SYSTEM) {
      return false;
    }

    // Cannot set roles to system
    if (this.normalizeRole(newRole) === UserRole.SYSTEM) {
      return false;
    }

    return true;
  }

  /**
   * Determines if a user can create accounts with specific roles
   */
  static canCreateUserWithRole(creator: User, targetRole: UserRole | string): boolean {
    const normalizedTargetRole = this.normalizeRole(targetRole);
    const creatorRole = this.normalizeRole(creator.role);
    // System can create any role
    if (creatorRole === UserRole.SYSTEM) {
      return normalizedTargetRole !== UserRole.SYSTEM;
    }

    // Enablers can create buyer, seller, supplier, courier roles
    if (creatorRole === UserRole.ENABLER) {
      return [UserRole.BUYER, UserRole.SELLER, UserRole.SUPPLIER, UserRole.COURIER].includes(normalizedTargetRole);
    }

    // Other roles cannot create accounts
    return false;
  }

  /**
   * Business rules for authentication limits
   */
  static getAuthenticationLimits(userRole: UserRole | string): {
    maxSessions: number;
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
  } {
    const baseLimits = {
      maxSessions: 5,
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 30
    };

    // System users have higher limits
    if (this.normalizeRole(userRole) === UserRole.SYSTEM) {
      return {
        maxSessions: 10,
        maxFailedAttempts: 3,
        lockoutDurationMinutes: 15
      };
    }

    return baseLimits;
  }

  /**
   * Determines if a user can bypass rate limits
   */
  static canBypassRateLimits(user: User): boolean {
    const role = this.normalizeRole(user.role);
    return role === UserRole.SYSTEM || role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can view security logs
   */
  static canViewSecurityLogs(user: User): boolean {
    return this.normalizeRole(user.role) === UserRole.SYSTEM;
  }

  /**
   * Determines if a user can perform security operations
   */
  static canPerformSecurityOperations(user: User): boolean {
    return this.normalizeRole(user.role) === UserRole.SYSTEM;
  }
}
