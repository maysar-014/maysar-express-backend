import { UserSecurityPolicy } from '../user-security.policy';
import { User } from '../../entities/user.entity';
import { Email } from '../../value-objects/email.value-object';
import { PhoneNumber } from '../../value-objects/phone-number.value-object';
import { UserRole } from '../../types/user.types';

describe('UserSecurityPolicy - Coverage Tests', () => {
  const policy = new UserSecurityPolicy();

  function makeUser(overrides: any = {}) {
    return User.create({
      id: 'u1',
      email: Email.create('a@gmail.com'),
      phoneNumber: PhoneNumber.create('+255712345678'),
      firstName: 'A',
      lastName: 'B',
      role: UserRole.BUYER,
      ...overrides
    } as any);
  }

  describe('canPerformSensitiveOperation - all branches', () => {
    it('returns true for verified active user with low risk', () => {
      const verified = makeUser().verifyEmail().verifyPhone().updateMetadata({ riskScore: 50 });
      expect(policy.canPerformSensitiveOperation(verified)).toBe(true);
    });

    it('returns false for inactive user', () => {
      const inactive = makeUser().deactivate();
      expect(policy.canPerformSensitiveOperation(inactive)).toBe(false);
    });

    it('returns false for unverified user', () => {
      const unverified = makeUser();
      expect(policy.canPerformSensitiveOperation(unverified)).toBe(false);
    });

    it('returns false for locked user', () => {
      const locked = makeUser().updateMetadata({ accountLockedUntil: new Date(Date.now() + 10000) });
      expect(policy.canPerformSensitiveOperation(locked)).toBe(false);
    });

    it('returns false for high risk user', () => {
      const risky = makeUser().updateMetadata({ riskScore: 90 });
      expect(policy.canPerformSensitiveOperation(risky)).toBe(false);
    });
  });

  describe('canChangePassword - all branches', () => {
    it('returns false for inactive user', () => {
      const u = makeUser().deactivate();
      expect(policy.canChangePassword(u)).toBe(false);
    });

    it('returns true when passwordChangeRequired is true', () => {
      const needChange = makeUser().updateMetadata({ passwordChangeRequired: true });
      expect(policy.canChangePassword(needChange)).toBe(true);
    });

    it('returns true for recently changed password', () => {
      const recentlyChanged = makeUser().updateMetadata({ lastPasswordChange: new Date(Date.now() - 5 * 24 * 3600 * 1000) });
      expect(policy.canChangePassword(recentlyChanged)).toBe(true);
    });

    it('returns false for old password (>90 days)', () => {
      const oldPassword = makeUser().updateMetadata({ lastPasswordChange: new Date(Date.now() - 100 * 24 * 3600 * 1000) });
      expect(policy.canChangePassword(oldPassword)).toBe(false);
    });

    it('returns true when no lastPasswordChange', () => {
      const noLastChange = makeUser();
      expect(policy.canChangePassword(noLastChange)).toBe(true);
    });
  });

  describe('canEnableTwoFactor - all branches', () => {
    it('returns true for verified active user', () => {
      let u = makeUser();
      u = u.verifyEmail().verifyPhone();
      expect(policy.canEnableTwoFactor(u)).toBe(true);
    });

    it('returns false for unverified user', () => {
      const unverified = makeUser();
      expect(policy.canEnableTwoFactor(unverified)).toBe(false);
    });

    it('returns false for inactive user', () => {
      const inactive = makeUser().verifyEmail().verifyPhone().deactivate();
      expect(policy.canEnableTwoFactor(inactive)).toBe(false);
    });
  });

  describe('isSuspiciousEmail - all branches', () => {
    it('detects disposable email domains', () => {
      expect(policy.isSuspiciousEmail('x@10minutemail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('x@tempmail.org')).toBe(true);
      expect(policy.isSuspiciousEmail('x@guerrillamail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('x@throwaway.email')).toBe(true);
      expect(policy.isSuspiciousEmail('x@mailinator.com')).toBe(true);
    });

    it('detects suspicious patterns', () => {
      expect(policy.isSuspiciousEmail('test+123@gmail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('temp123@gmail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('throwaway456@gmail.com')).toBe(true);
    });

    it('allows normal emails', () => {
      expect(policy.isSuspiciousEmail('normal@gmail.com')).toBe(false);
      expect(policy.isSuspiciousEmail('user@example.com')).toBe(false);
    });
  });

  describe('isSuspiciousPhoneNumber - all branches', () => {
    it('allows valid Tanzanian mobile numbers', () => {
      expect(policy.isSuspiciousPhoneNumber('+2557112345678')).toBe(false);
      expect(policy.isSuspiciousPhoneNumber('+255712345678')).toBe(false);
      expect(policy.isSuspiciousPhoneNumber('+255222123456')).toBe(false);
    });

    it('rejects non-Tanzanian numbers', () => {
      expect(policy.isSuspiciousPhoneNumber('+12223334444')).toBe(true);
      expect(policy.isSuspiciousPhoneNumber('+441234567890')).toBe(true);
    });
  });

  describe('canPerformFinancialOperation - all branches', () => {
    it('returns true for verified active user with low risk', () => {
      const u = makeUser().verifyEmail().verifyPhone().updateMetadata({ riskScore: 10 });
      expect(policy.canPerformFinancialOperation(u)).toBe(true);
    });

    it('returns false for inactive user', () => {
      const inactive = makeUser().deactivate();
      expect(policy.canPerformFinancialOperation(inactive)).toBe(false);
    });

    it('returns false for unverified user', () => {
      const unverified = makeUser();
      expect(policy.canPerformFinancialOperation(unverified)).toBe(false);
    });

    it('returns false for high risk user (>50)', () => {
      const highRisk = makeUser().verifyEmail().verifyPhone().updateMetadata({ riskScore: 60 });
      expect(policy.canPerformFinancialOperation(highRisk)).toBe(false);
    });
  });

  describe('canPerformHighValueTransaction - all branches', () => {
    it('returns true for active user with low risk', () => {
      const u = makeUser().updateMetadata({ riskScore: 10 });
      expect(policy.canPerformHighValueTransaction(u, 1000)).toBe(true);
    });

    it('returns false for inactive user', () => {
      const inactive = makeUser().deactivate();
      expect(policy.canPerformHighValueTransaction(inactive, 1000)).toBe(false);
    });

    it('returns false for high risk user (>60)', () => {
      const highRisk = makeUser().updateMetadata({ riskScore: 70 });
      expect(policy.canPerformHighValueTransaction(highRisk, 1000)).toBe(false);
    });
  });

  describe('canAccessAdminFeatures - all branches', () => {
    it('returns true for SYSTEM role active user with low risk', () => {
      const admin = makeUser({ role: UserRole.SYSTEM }).updateMetadata({ riskScore: 10 });
      expect(policy.canAccessAdminFeatures(admin)).toBe(true);
    });

    it('returns false for non-SYSTEM role', () => {
      const nonAdmin = makeUser({ role: UserRole.BUYER });
      expect(policy.canAccessAdminFeatures(nonAdmin)).toBe(false);
    });

    it('returns false for inactive SYSTEM user', () => {
      const inactiveAdmin = makeUser({ role: UserRole.SYSTEM }).deactivate();
      expect(policy.canAccessAdminFeatures(inactiveAdmin)).toBe(false);
    });

    it('returns false for high risk SYSTEM user (>30)', () => {
      const riskyAdmin = makeUser({ role: UserRole.SYSTEM }).updateMetadata({ riskScore: 40 });
      expect(policy.canAccessAdminFeatures(riskyAdmin)).toBe(false);
    });
  });

  describe('isSecureSession - all branches', () => {
    it('returns false for suspicious IP addresses', () => {
      const user = makeUser();
      expect(policy.isSecureSession(user, { ipAddress: '10.0.0.1', userAgent: 'x' })).toBe(false);
      expect(policy.isSecureSession(user, { ipAddress: '192.168.1.1', userAgent: 'x' })).toBe(false);
      expect(policy.isSecureSession(user, { ipAddress: '127.0.0.1', userAgent: 'x' })).toBe(false);
    });

    it('returns false for unusual location with high risk user', () => {
      const user = makeUser().updateMetadata({ riskScore: 50 });
      expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x', location: 'Unknown' })).toBe(false);
    });

    it('returns true for safe IP and low risk user', () => {
      const lowRiskUser = makeUser().updateMetadata({ riskScore: 20 });
      expect(policy.isSecureSession(lowRiskUser, { ipAddress: '8.8.8.8', userAgent: 'x', location: 'Unknown' })).toBe(true);
    });

    it('returns true for user with trusted devices', () => {
      const trustedUser = makeUser().updateMetadata({ trustedDeviceCount: 2 });
      expect(policy.isSecureSession(trustedUser, { ipAddress: '8.8.8.8', userAgent: 'x' })).toBe(true);
    });
  });

  describe('evaluate - all branches', () => {
    it('evaluates canPerformSensitiveOperation with single User arg', () => {
      const u = makeUser().verifyEmail().verifyPhone();
      expect(policy.evaluate(u)).toBe(policy.canPerformSensitiveOperation(u));
    });

    it('evaluates canPerformHighValueTransaction with User and number args', () => {
      const u = makeUser();
      expect(policy.evaluate(u, 100)).toBe(policy.canPerformHighValueTransaction(u, 100));
    });

    it('returns false for invalid arguments', () => {
      expect(policy.evaluate()).toBe(false);
      expect(policy.evaluate('invalid')).toBe(false);
      expect(policy.evaluate({}, {})).toBe(false);
    });
  });

  describe('isRateLimited', () => {
    it('always returns false', () => {
      expect(policy.isRateLimited('test-identifier')).toBe(false);
      expect(policy.isRateLimited('another-id')).toBe(false);
    });
  });
});
