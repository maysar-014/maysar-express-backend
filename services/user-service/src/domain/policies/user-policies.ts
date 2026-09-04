/**
 * Domain policies for user management
 * Contains business rules and constraints for user operations
 */

import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Email } from '../value-objects/email.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';

export class UserPolicies {
  /**
   * Business rules for user registration
   */
  static canRegister(email: Email, phoneNumber?: PhoneNumber): { allowed: boolean; reason?: string } {
    // Email domain restrictions
    if (!email.isTrustedDomain()) {
      return { allowed: false, reason: 'Email domain not allowed' };
    }

    // Phone number validation for Tanzanian market
    if (phoneNumber && !phoneNumber.isTanzanian()) {
      return { allowed: false, reason: 'Phone number must be Tanzanian' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for user profile updates
   */
  static canUpdateProfile(user: User, updates: any): { allowed: boolean; reason?: string } {
    // Block only administratively restricted accounts.
    // PENDING_VERIFICATION and LOCKED users can still manage their own profile
    // (e.g. add addresses, set preferences) — blocking them here creates UX dead-ends
    // especially for new registrations that haven't confirmed email yet.
    const blockedStatuses: UserStatus[] = [UserStatus.SUSPENDED, UserStatus.DEACTIVATED, UserStatus.INACTIVE];
    if (blockedStatuses.includes(user.status as UserStatus)) {
      return { allowed: false, reason: 'User account is not active' };
    }

    // Email updates require verification
    if (updates.email && updates.email !== user.email.toString()) {
      return { allowed: false, reason: 'Email updates not allowed through profile update' };
    }

    // Age restrictions for certain updates
    if (updates.dateOfBirth) {
      const age = UserPolicies.calculateAge(new Date(updates.dateOfBirth));
      if (age < 13) {
        return { allowed: false, reason: 'Users must be at least 13 years old' };
      }
    }

    return { allowed: true };
  }

  /**
   * Business rules for user verification
   */
  static canVerifyUser(user: User, verificationType: 'email' | 'phone'): { allowed: boolean; reason?: string } {
    if (user.status === UserStatus.DEACTIVATED) {
      return { allowed: false, reason: 'Cannot verify deactivated user' };
    }

    if (verificationType === 'email' && !user.email) {
      return { allowed: false, reason: 'User has no email address' };
    }

    if (verificationType === 'phone' && !user.phoneNumber) {
      return { allowed: false, reason: 'User has no phone number' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for user role changes
   */
  static canChangeRole(currentUser: User, targetUser: User, newRole: UserRole): { allowed: boolean; reason?: string } {
    // Only system admins can change roles
    if (currentUser.role !== UserRole.SYSTEM) {
      return { allowed: false, reason: 'Insufficient permissions to change user role' };
    }

    // Cannot change system admin roles
    if (targetUser.role === UserRole.SYSTEM) {
      return { allowed: false, reason: 'System admin roles cannot be modified' };
    }

    // Business role transition rules
    const validTransitions: Record<UserRole, UserRole[]> = {
      [UserRole.BUYER]: [UserRole.SELLER, UserRole.SUPPLIER],
      [UserRole.SELLER]: [UserRole.BUYER, UserRole.SUPPLIER],
      [UserRole.SUPPLIER]: [UserRole.SELLER],
      [UserRole.COURIER]: [],
      [UserRole.ENABLER]: [],
      [UserRole.SYSTEM]: []
    };

    if (!validTransitions[targetUser.role]?.includes(newRole)) {
      return { allowed: false, reason: `Invalid role transition from ${targetUser.role} to ${newRole}` };
    }

    return { allowed: true };
  }

  /**
   * Business rules for user status changes
   */
  static canChangeStatus(currentUser: User, targetUser: User, newStatus: UserStatus): { allowed: boolean; reason?: string } {
    // Only system admins can change user status
    if (currentUser.role !== UserRole.SYSTEM) {
      return { allowed: false, reason: 'Insufficient permissions to change user status' };
    }

    // Cannot suspend system admins
    if (targetUser.role === UserRole.SYSTEM && newStatus === UserStatus.SUSPENDED) {
      return { allowed: false, reason: 'System admin accounts cannot be suspended' };
    }

    // Business status transition rules
    const invalidTransitions: Array<[UserStatus, UserStatus]> = [
      [UserStatus.DEACTIVATED, UserStatus.ACTIVE], // Deactivated accounts cannot be reactivated
      [UserStatus.LOCKED, UserStatus.ACTIVE] // Locked accounts need manual unlock
    ];

    const transition = [targetUser.status, newStatus] as [UserStatus, UserStatus];
    if (invalidTransitions.some(([from, to]) => from === transition[0] && to === transition[1])) {
      return { allowed: false, reason: `Invalid status transition from ${transition[0]} to ${transition[1]}` };
    }

    return { allowed: true };
  }

  /**
   * Business rules for user deletion
   */
  static canDeleteUser(currentUser: User, targetUser: User): { allowed: boolean; reason?: string } {
    // Only system admins can delete users
    if (currentUser.role !== UserRole.SYSTEM) {
      return { allowed: false, reason: 'Only system administrators can delete users' };
    }

    // Cannot delete system admins
    if (targetUser.role === UserRole.SYSTEM) {
      return { allowed: false, reason: 'System admin accounts cannot be deleted' };
    }

    // Cannot delete active users (must deactivate first)
    if (targetUser.status === UserStatus.ACTIVE) {
      return { allowed: false, reason: 'Active users must be deactivated before deletion' };
    }

    // Retention policy: cannot delete users with recent activity
    const daysSinceLastLogin = targetUser.lastLoginAt
      ? Math.floor((Date.now() - targetUser.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastLogin !== null && daysSinceLastLogin < 90) {
      return { allowed: false, reason: 'Users with recent activity (last 90 days) cannot be deleted' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for password changes
   */
  static canChangePassword(user: User): { allowed: boolean; reason?: string } {
    // Block only administratively restricted accounts from changing passwords
    const blockedStatuses: UserStatus[] = [UserStatus.SUSPENDED, UserStatus.DEACTIVATED, UserStatus.INACTIVE];
    if (blockedStatuses.includes(user.status as UserStatus)) {
      return { allowed: false, reason: 'User account is not active' };
    }

    return { allowed: true };
  }

  /**
   * Business rules for account recovery
   */
  static canRecoverAccount(email: Email, phoneNumber?: PhoneNumber): { allowed: boolean; method?: 'email' | 'phone'; reason?: string } {
    // Prefer email recovery for verified emails
    if (email) {
      return { allowed: true, method: 'email' };
    }

    // Fallback to phone if available
    if (phoneNumber && phoneNumber.isTanzanian()) {
      return { allowed: true, method: 'phone' };
    }

    return { allowed: false, reason: 'No valid recovery method available' };
  }

  /**
   * Business rules for bulk operations
   */
  static canPerformBulkOperation(currentUser: User, operation: string, targetCount: number): { allowed: boolean; reason?: string } {
    // Only system admins can perform bulk operations
    if (currentUser.role !== UserRole.SYSTEM) {
      return { allowed: false, reason: 'Insufficient permissions for bulk operations' };
    }

    // Bulk operation size limits
    const maxBulkSizes: Record<string, number> = {
      'status_update': 100,
      'role_change': 50,
      'deactivation': 25,
      'deletion': 10
    };

    const maxSize = maxBulkSizes[operation];
    if (maxSize && targetCount > maxSize) {
      return { allowed: false, reason: `Bulk ${operation} limited to ${maxSize} users at once` };
    }

    return { allowed: true };
  }

  /**
   * Business rules for user search and filtering
   */
  static canSearchUsers(currentUser: User, filters: any): { allowed: boolean; reason?: string } {
    // Basic users can only search themselves
    if (currentUser.role === UserRole.BUYER) {
      if (filters.id && filters.id !== currentUser.id) {
        return { allowed: false, reason: 'Users can only access their own data' };
      }
    }

    // Sellers and suppliers can search their related users (orders, etc.)
    // Implementation depends on business relationships

    // Only system admins have broader user search access
    if (currentUser.role === UserRole.SYSTEM) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Insufficient permissions to search users' };
  }

  /**
   * Business rules for data export/privacy
   */
  static canExportUserData(currentUser: User, targetUser: User): { allowed: boolean; reason?: string } {
    // Users can export their own data
    if (currentUser.id === targetUser.id) {
      return { allowed: true };
    }

    // System admins can export any user's data (GDPR compliance)
    if (currentUser.role === UserRole.SYSTEM) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Can only export own data or require admin privileges' };
  }

  /**
   * Business rules for user preferences
   */
  static validateUserPreferences(preferences: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Language validation
    if (preferences.language && !['en', 'sw', 'fr'].includes(preferences.language)) {
      errors.push('Language must be one of: en, sw, fr');
    }

    // Timezone validation
    if (preferences.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: preferences.timezone });
      } catch {
        errors.push('Invalid timezone');
      }
    }

    // Quiet hours validation
    if (preferences.quietHoursStart && preferences.quietHoursEnd) {
      const start = preferences.quietHoursStart;
      const end = preferences.quietHoursEnd;

      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(start) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(end)) {
        errors.push('Quiet hours must be in HH:MM format');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Helper: Calculate age from date of birth
   */
  private static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Business rules for user analytics and reporting
   */
  static canViewAnalytics(currentUser: User, reportType: string): { allowed: boolean; reason?: string } {
    // System admins have full access
    if (currentUser.role === UserRole.SYSTEM) {
      return { allowed: true };
    }

    // Sellers can view their own metrics
    if (currentUser.role === UserRole.SELLER) {
      const allowedReports = ['own_performance', 'customer_feedback'];
      if (allowedReports.includes(reportType)) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'Insufficient permissions to view this report' };
  }
}
