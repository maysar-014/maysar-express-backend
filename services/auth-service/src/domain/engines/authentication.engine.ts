import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Email } from '../value-objects/email.value-object';
import { PasswordHash } from '../value-objects/password-hash.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';
import { AuthenticationPolicy } from '../policies/authentication.policy';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy';

/**
 * Authentication Engine - Orchestrates authentication algorithms and policies
 * Makes business decisions about authentication operations
 */
export class AuthenticationEngine {
  /**
   * Authenticates a user with email/password
   */
  static async authenticateUser(
    user: User,
    providedPassword: string,
    providedTotpCode?: string
  ): Promise<{
    success: boolean;
    requiresTwoFactor?: boolean;
    locked?: boolean;
    message: string;
  }> {
    // Check if authentication is allowed
    if (!AuthenticationPolicy.canAuthenticate(user)) {
      return {
        success: false,
        message: 'Authentication not allowed for this account'
      };
    }

    // Check if account is locked
    if (user.isLocked()) {
      return {
        success: false,
        locked: true,
        message: 'Account is temporarily locked due to too many failed attempts'
      };
    }

    // Verify password
    const passwordValid = await user.passwordHash.verifyPassword(providedPassword);

    if (!passwordValid) {
      // Record failed attempt
      user.recordFailedLogin();
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if two-factor authentication is required
    if (user.requiresTwoFactor()) {
      if (!providedTotpCode) {
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Two-factor authentication code required'
        };
      }

      // Verify TOTP code (simplified - in real implementation, use speakeasy or similar)
      const totpValid = await this.verifyTotpCode(user.twoFactorSecret!, providedTotpCode);

      if (!totpValid) {
        user.recordFailedLogin();
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Invalid two-factor authentication code'
        };
      }
    }

    // Record successful login
    user.recordSuccessfulLogin();

    return {
      success: true,
      message: 'Authentication successful'
    };
  }

  /**
   * Registers a new user account - DEPRECATED
   * User registration is now handled by the User Service
   * This method is kept for backward compatibility during migration
   */
  static async registerUser(
    email: Email,
    password: string,
    role: UserRole,
    creator?: User,
    phoneNumber?: PhoneNumber
  ): Promise<{
    success: boolean;
    user?: User;
    requiresEmailVerification?: boolean;
    requiresPhoneVerification?: boolean;
    message: string;
  }> {
    // Check if creator can create users with this role
    if (creator && !AuthenticationPolicy.canCreateUserWithRole(creator, role)) {
      return {
        success: false,
        message: 'Insufficient permissions to create user with this role'
      };
    }

    // Validate password strength
    if (!PasswordHash.isValidPassword(password)) {
      return {
        success: false,
        message: 'Password does not meet security requirements'
      };
    }

    try {
      // Create password hash
      const passwordHash = await PasswordHash.fromPlainPassword(password);

      // Create user
      const user = User.create({
        id: this.generateUserId(),
        email: email.toString(),
        passwordHash,
        role: role as string,
        status: UserStatus.PENDING_VERIFICATION
      });

      // Set phone number if provided
      if (phoneNumber) {
        user.updatePhoneNumber(phoneNumber);
      }

      return {
        success: true,
        user,
        requiresEmailVerification: true,
        requiresPhoneVerification: !!phoneNumber,
        message: 'User account created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create user account'
      };
    }
  }

  /**
   * Changes user password
   */
  static async changePassword(
    user: User,
    currentPassword: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Check if user can change password
    if (!AuthenticationPolicy.canChangePassword(user)) {
      return {
        success: false,
        message: 'Password change not allowed for this account'
      };
    }

    // Verify current password
    const currentPasswordValid = await user.passwordHash.verifyPassword(currentPassword);
    if (!currentPasswordValid) {
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }

    // Validate new password
    if (!PasswordHash.isValidPassword(newPassword)) {
      return {
        success: false,
        message: 'New password does not meet security requirements'
      };
    }

    // Check if new password is different from current
    const newPasswordValid = await user.passwordHash.verifyPassword(newPassword);
    if (newPasswordValid) {
      return {
        success: false,
        message: 'New password must be different from current password'
      };
    }

    try {
      // Create new password hash
      const newPasswordHash = await PasswordHash.fromPlainPassword(newPassword);

      // Update user password
      user.changePassword(newPasswordHash);

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to change password'
      };
    }
  }

  /**
   * Initiates password reset process
   */
  static initiatePasswordReset(
    user: User
  ): {
    success: boolean;
    resetToken?: string;
    expiresAt?: Date;
    message: string;
  } {
    // Check if user can reset password
    if (!AuthenticationPolicy.canResetPassword(user)) {
      return {
        success: false,
        message: 'Password reset not allowed for this account'
      };
    }

    const resetToken = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return {
      success: true,
      resetToken,
      expiresAt,
      message: 'Password reset initiated successfully'
    };
  }

  /**
   * Resets password using reset token
   */
  static async resetPassword(
    user: User,
    resetToken: string,
    newPassword: string,
    tokenExpiresAt: Date
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Check if token is expired
    if (tokenExpiresAt < new Date()) {
      return {
        success: false,
        message: 'Password reset token has expired'
      };
    }

    // Validate new password
    if (!PasswordHash.isValidPassword(newPassword)) {
      return {
        success: false,
        message: 'New password does not meet security requirements'
      };
    }

    try {
      // Create new password hash
      const newPasswordHash = await PasswordHash.fromPlainPassword(newPassword);

      // Update user password
      user.changePassword(newPasswordHash);

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reset password'
      };
    }
  }

  /**
   * Enables two-factor authentication
   */
  static enableTwoFactor(
    user: User,
    secret: string
  ): {
    success: boolean;
    qrCodeUrl?: string;
    backupCodes?: string[];
    message: string;
  } {
    // Check if user can enable 2FA
    if (!AuthenticationPolicy.canEnableTwoFactor(user)) {
      return {
        success: false,
        message: 'Two-factor authentication cannot be enabled for this account'
      };
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Enable 2FA
    user.enableTwoFactor(secret);

    // Generate QR code URL for authenticator apps
    const qrCodeUrl = `otpauth://totp/Maysar:${user.email.toString()}?secret=${secret}&issuer=Maysar`;

    return {
      success: true,
      qrCodeUrl,
      backupCodes,
      message: 'Two-factor authentication enabled successfully'
    };
  }

  /**
   * Disables two-factor authentication
   */
  static disableTwoFactor(user: User): {
    success: boolean;
    message: string;
  } {
    // Disable 2FA
    user.disableTwoFactor();

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully'
    };
  }

  /**
   * Verifies email address
   */
  static verifyEmail(
    user: User,
    verificationToken: string
  ): {
    success: boolean;
    message: string;
  } {
    if (!verificationToken || verificationToken.length < 32) {
      return {
        success: false,
        message: 'Invalid verification token'
      };
    }

    user.verifyEmail();

    return {
      success: true,
      message: 'Email verified successfully'
    };
  }

  /**
   * Verifies phone number
   */
  static verifyPhone(
    user: User,
    verificationCode: string
  ): {
    success: boolean;
    message: string;
  } {
    if (!/^\d{6}$/.test(verificationCode)) {
      return {
        success: false,
        message: 'Invalid verification code format'
      };
    }

    user.verifyPhone();

    return {
      success: true,
      message: 'Phone number verified successfully'
    };
  }

  /**
   * Manages user account status
   */
  static manageAccountStatus(
    manager: User,
    target: User,
    action: 'suspend' | 'reactivate' | 'deactivate' | 'unlock',
    reason?: string
  ): {
    success: boolean;
    message: string;
  } {
    if (!AuthenticationPolicy.canManageUsers(manager, target)) {
      return {
        success: false,
        message: 'Insufficient permissions to manage this user'
      };
    }

    const actionReason = reason || `Account ${action} by ${manager.id}`;

    switch (action) {
      case 'suspend':
        target.suspend();
        return { success: true, message: `User account suspended: ${actionReason}` };

      case 'reactivate':
        target.reactivate();
        return { success: true, message: `User account reactivated: ${actionReason}` };

      case 'deactivate':
        target.deactivate();
        return { success: true, message: `User account deactivated: ${actionReason}` };

      case 'unlock':
        target.unlock();
        return { success: true, message: `User account unlocked: ${actionReason}` };

      default:
        return { success: false, message: 'Invalid action specified' };
    }
  }

  /**
   * Changes user role
   */
  static changeUserRole(
    changer: User,
    target: User,
    newRole: UserRole
  ): {
    success: boolean;
    message: string;
  } {
    // Check permissions
    if (!AuthenticationPolicy.canChangeUserRole(changer, target, newRole)) {
      return {
        success: false,
        message: 'Insufficient permissions to change user role'
      };
    }

    // Change role
    target.changeRole(newRole);

    return {
      success: true,
      message: `User role changed to ${newRole} successfully`
    };
  }

  /**
   * Validates session token
   */
  static validateSession(
    user: User,
    sessionToken: string,
    clientInfo: {
      ip: string;
      userAgent: string;
    }
  ): {
    valid: boolean;
    requiresReauth?: boolean;
    suspiciousActivity?: boolean;
    message: string;
  } {
    // Basic validation - in real implementation, check against stored sessions
    // and validate token expiration, IP changes, etc.

    if (!user.canAccessSystem()) {
      return {
        valid: false,
        message: 'User account is not authorized for system access'
      };
    }

    const suspiciousActivity = this.detectSuspiciousActivity(user, clientInfo);

    if (suspiciousActivity) {
      return {
        valid: true,
        suspiciousActivity: true,
        requiresReauth: true,
        message: 'Session valid but suspicious activity detected'
      };
    }

    return {
      valid: true,
      message: 'Session is valid'
    };
  }

  // Private helper methods

  /**
   * Generates unique user ID
   */
  private static generateUserId(): string {
    return makeId(getModelPrefix('User_User'));
  }

  /**
   * Generates secure reset token
   */
  private static generateSecureToken(): string {
    return `reset_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Verifies TOTP code using Speakeasy
   */
  private static async verifyTotpCode(secret: string, code: string): Promise<boolean> {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 1
      });
    } catch {
      return false;
    }
  }

  /**
   * Generates backup codes for 2FA
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(randomBytes(5).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Detects suspicious activity (simplified)
   */
  private static detectSuspiciousActivity(
    user: User,
    clientInfo: { ip: string; userAgent: string }
  ): boolean {
    const accountAgeHours = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
    const isNewAccount = accountAgeHours < 24;
    const hasUnusualUserAgent = clientInfo.userAgent.includes('bot') || clientInfo.userAgent.includes('curl');
    
    return isNewAccount || hasUnusualUserAgent;
  }
}
