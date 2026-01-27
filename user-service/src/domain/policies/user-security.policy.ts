import { DomainPolicy } from '@domain/interfaces';
import { User } from '@domain/entities/user.entity';
import { UserMetadata } from '@domain/types/user.types';

/**
 * User Security Policy
 * Defines security-related policies for user operations
 */
export class UserSecurityPolicy implements DomainPolicy {
  public readonly name = 'UserSecurityPolicy';

  /**
   * Check if user can perform sensitive operations
   */
  canPerformSensitiveOperation(user: User): boolean {
    if (!user.isActive()) {
      return false;
    }

    if (!user.isVerified()) {
      return false;
    }

    if (user.metadata.accountLockedUntil && user.metadata.accountLockedUntil > new Date()) {
      return false;
    }

    if (user.metadata.riskScore && user.metadata.riskScore > 80) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can change password
   */
  canChangePassword(user: User): boolean {
    if (!user.isActive()) {
      return false;
    }

    if (user.metadata.passwordChangeRequired) {
      return true;
    }

    if (user.metadata.lastPasswordChange) {
      const daysSinceLastChange = this.getDaysSince(user.metadata.lastPasswordChange);
      return daysSinceLastChange < 90;
    }

    return true;
  }

  /**
   * Check if user can enable two-factor authentication
   */
  canEnableTwoFactor(user: User): boolean {
    return user.isVerified() && user.isActive();
  }

  /**
   * Check if email is suspicious
   */
  isSuspiciousEmail(email: string): boolean {
    // Check for disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'throwaway.email', 'mailinator.com'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && disposableDomains.includes(domain)) {
      return true;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\+\d+@/, // Email with + and numbers (often disposable)
      /temp\d+@/, // Temp with numbers
      /throwaway\d+@/, // Throwaway with numbers
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email.toLowerCase()));
  }

  /**
   * Check if phone number is suspicious
   */
  isSuspiciousPhoneNumber(phoneNumber: string): boolean {
    // Check for VoIP numbers (often used for fraud)
    const voipPatterns = [
      /^(\+?255)?(71[0-9]|72[0-9]|73[0-9]|74[0-9]|75[0-9]|76[0-9]|77[0-9]|78[0-9]|79[0-9])\d{7}$/, // Tanzanian mobile
      /^(\+?255)?(2[0-9])\d{7}$/, // Tanzanian landline
    ];

    // If it doesn't match valid Tanzanian patterns, it might be suspicious
    return !voipPatterns.some(pattern => pattern.test(phoneNumber));
  }

  /**
   * Check if user is rate limited
   */
  isRateLimited(identifier: string): boolean {
    // This would typically check a cache/database for rate limiting
    // For now, return false to allow registration
    return false;
  }

  /**
   * Check if user can perform financial operations
   */
  canPerformFinancialOperation(user: User): boolean {
    if (!user.isActive()) {
      return false;
    }

    if (!user.isVerified()) {
      return false;
    }

    if (user.metadata.riskScore && user.metadata.riskScore > 50) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can perform high-value transactions
   */
  canPerformHighValueTransaction(user: User, amount: number): boolean {
    if (!user.isActive()) {
      return false;
    }

    if (user.metadata.riskScore && user.metadata.riskScore > 60) {
      return false;
    }

    // Note: dailyTransactionLimit is not in UserMetadata interface yet
    // This would need to be added to the interface
    // if (user.metadata.dailyTransactionLimit && amount > user.metadata.dailyTransactionLimit) {
    //   return false;
    // }

    return true;
  }

  /**
   * Check if user session is secure
   */
  isSecureSession(user: User, sessionInfo: { ipAddress: string; userAgent: string; location?: string }): boolean {
    // Check for suspicious IP addresses
    if (this.isSuspiciousIPAddress(sessionInfo.ipAddress)) {
      return false;
    }

    // Check for known trusted devices
    if (user.metadata.trustedDeviceCount && user.metadata.trustedDeviceCount > 0) {
      // In a real implementation, this would check against known devices
      // For now, we'll assume it's secure if not from a suspicious IP
    }

    // Check for unusual location
    if (sessionInfo.location && this.isUnusualLocation(user, sessionInfo.location)) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can access admin features
   */
  canAccessAdminFeatures(user: User): boolean {
    if (user.role !== 'admin') {
      return false;
    }

    if (!user.isActive()) {
      return false;
    }

    if (user.metadata.riskScore && user.metadata.riskScore > 30) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate policy (generic interface implementation)
   */
  evaluate(...args: any[]): boolean {
    if (args.length === 1 && args[0] instanceof User) {
      return this.canPerformSensitiveOperation(args[0]);
    }
    
    if (args.length === 2 && args[0] instanceof User && typeof args[1] === 'number') {
      return this.canPerformHighValueTransaction(args[0], args[1]);
    }

    return false;
  }

  /**
   * Check if IP address is suspicious
   */
  private isSuspiciousIPAddress(ipAddress: string): boolean {
    // In a real implementation, this would check against known malicious IPs
    // For now, we'll use a simple check
    const suspiciousPatterns = [
      /^10\./, // Private networks (could be VPN)
      /^192\.168\./, // Private networks
      /^127\./, // Localhost
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ipAddress));
  }

  /**
   * Check if location is unusual for user
   */
  private isUnusualLocation(user: User, location: string): boolean {
    // In a real implementation, this would check against user's historical locations
    // For now, we'll assume any location change is suspicious for high-risk users
    if (user.metadata.riskScore && user.metadata.riskScore > 40) {
      return true;
    }

    return false;
  }

  /**
   * Get days since a date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get hours since a date
   */
  private getHoursSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60));
  }
}