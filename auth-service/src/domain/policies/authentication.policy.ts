import { User, UserRole, UserStatus } from '../entities/user.entity';

/**
 * Authentication Policy - Allow/deny decisions for authentication operations
 * Contains all business rules for authentication permissions and access control
 */
export class AuthenticationPolicy {
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
    return user.role === UserRole.SYSTEM ||
           user.role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can manage other users
   */
  static canManageUsers(manager: User, target: User): boolean {
    // Only system and enabler roles can manage users
    if (manager.role !== UserRole.SYSTEM && manager.role !== UserRole.ENABLER) {
      return false;
    }

    // Cannot manage system users
    if (target.role === UserRole.SYSTEM) {
      return false;
    }

    // Enablers cannot manage other enablers
    if (manager.role === UserRole.ENABLER && target.role === UserRole.ENABLER) {
      return false;
    }

    return true;
  }

  /**
   * Determines if a user can view another user's profile
   */
  static canViewUserProfile(viewer: User, target: User): boolean {
    // System users can view all profiles
    if (viewer.role === UserRole.SYSTEM) {
      return true;
    }

    // Enablers can view all non-system profiles
    if (viewer.role === UserRole.ENABLER && target.role !== UserRole.SYSTEM) {
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
    // Users can update their own profile
    if (updater.id === target.id) {
      return true;
    }

    // System and enabler roles can update other users
    return (updater.role === UserRole.SYSTEM || updater.role === UserRole.ENABLER) &&
           target.role !== UserRole.SYSTEM;
  }

  /**
   * Determines if a user can delete another user
   */
  static canDeleteUser(deleter: User, target: User): boolean {
    // Cannot delete system users
    if (target.role === UserRole.SYSTEM) {
      return false;
    }

    // Only system users can delete other users
    return deleter.role === UserRole.SYSTEM;
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
    return user.role === UserRole.SYSTEM || user.role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can export data
   */
  static canExportData(user: User): boolean {
    return user.role === UserRole.SYSTEM || user.role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can access audit logs
   */
  static canAccessAuditLogs(user: User): boolean {
    return user.role === UserRole.SYSTEM || user.role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can configure system settings
   */
  static canConfigureSystem(user: User): boolean {
    return user.role === UserRole.SYSTEM;
  }

  /**
   * Determines if a user can send system notifications
   */
  static canSendSystemNotifications(user: User): boolean {
    return user.role === UserRole.SYSTEM || user.role === UserRole.ENABLER;
  }

  /**
   * Determines role hierarchy for permission checking
   */
  static getRoleHierarchy(): Record<UserRole, number> {
    return {
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
  static hasHigherOrEqualRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole] >= hierarchy[requiredRole];
  }

  /**
   * Gets all allowed roles for a given user role
   */
  static getAllowedRolesFor(userRole: UserRole): UserRole[] {
    const hierarchy = this.getRoleHierarchy();
    const userLevel = hierarchy[userRole];

    return Object.entries(hierarchy)
      .filter(([, level]) => level <= userLevel)
      .map(([role]) => role as UserRole);
  }

  /**
   * Determines if a role transition is allowed
   */
  static canChangeUserRole(changer: User, target: User, newRole: UserRole): boolean {
    // Only system users can change roles
    if (changer.role !== UserRole.SYSTEM) {
      return false;
    }

    // Cannot change system user roles
    if (target.role === UserRole.SYSTEM) {
      return false;
    }

    // Cannot set roles to system
    if (newRole === UserRole.SYSTEM) {
      return false;
    }

    return true;
  }

  /**
   * Determines if a user can create accounts with specific roles
   */
  static canCreateUserWithRole(creator: User, targetRole: UserRole): boolean {
    // System can create any role
    if (creator.role === UserRole.SYSTEM) {
      return targetRole !== UserRole.SYSTEM;
    }

    // Enablers can create buyer, seller, supplier, courier roles
    if (creator.role === UserRole.ENABLER) {
      return [UserRole.BUYER, UserRole.SELLER, UserRole.SUPPLIER, UserRole.COURIER].includes(targetRole);
    }

    // Other roles cannot create accounts
    return false;
  }

  /**
   * Business rules for authentication limits
   */
  static getAuthenticationLimits(userRole: UserRole): {
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
    if (userRole === UserRole.SYSTEM) {
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
    return user.role === UserRole.SYSTEM || user.role === UserRole.ENABLER;
  }

  /**
   * Determines if a user can view security logs
   */
  static canViewSecurityLogs(user: User): boolean {
    return user.role === UserRole.SYSTEM;
  }

  /**
   * Determines if a user can perform security operations
   */
  static canPerformSecurityOperations(user: User): boolean {
    return user.role === UserRole.SYSTEM;
  }
}
