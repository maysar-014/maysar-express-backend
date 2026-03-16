import { UserSecurityPolicy } from '../user-security.policy';
import { User } from '../../entities/user.entity';
import { Email } from '../../value-objects/email.value-object';
import { PhoneNumber } from '../../value-objects/phone-number.value-object';
import { UserRole } from '../../types/user.types';

const redisState = new Map<string, number>();
const redisClient = {
  incr: jest.fn(async (key: string) => {
    const next = (redisState.get(key) || 0) + 1;
    redisState.set(key, next);
    return next;
  }),
  expire: jest.fn(async () => 1)
};

const prismaMock = {
  user_TrustedDevice: {
    findFirst: jest.fn()
  }
};

jest.mock('@shared/redis/ioredis-client', () => ({
  getSharedRedisClient: jest.fn(() => redisClient)
}));

jest.mock('../../infrastructure/database/prisma-client', () => ({
  prisma: prismaMock
}));

describe('UserSecurityPolicy', () => {
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

  describe('canPerformSensitiveOperation', () => {
    test('returns false when user is inactive', () => {
      const inactive = makeUser().deactivate();
      expect(policy.canPerformSensitiveOperation(inactive)).toBe(false);
    });

    test('returns false when user is not verified', () => {
      const unverified = makeUser();
      expect(policy.canPerformSensitiveOperation(unverified)).toBe(false);
    });

    test('returns false when account is locked in future', () => {
      const locked = makeUser().updateMetadata({ accountLockedUntil: new Date(Date.now() + 10000) });
      expect(policy.canPerformSensitiveOperation(locked)).toBe(false);
    });

    test('returns false when risk score exceeds 80', () => {
      const risky = makeUser().updateMetadata({ riskScore: 90 });
      expect(policy.canPerformSensitiveOperation(risky)).toBe(false);
    });

    test('returns true when all conditions are met', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      u = u.updateMetadata({ riskScore: 50 });
      expect(policy.canPerformSensitiveOperation(u)).toBe(true);
    });

    test('returns true when accountLockedUntil is in the past', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      u = u.updateMetadata({ accountLockedUntil: new Date(Date.now() - 10000) });
      expect(policy.canPerformSensitiveOperation(u)).toBe(true);
    });

    test('returns true when riskScore is 50', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      u = u.updateMetadata({ riskScore: 50 });
      expect(policy.canPerformSensitiveOperation(u)).toBe(true);
    });

    test('returns true when riskScore is exactly 80', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      u = u.updateMetadata({ riskScore: 80 });
      expect(policy.canPerformSensitiveOperation(u)).toBe(true);
    });

    test('returns false when riskScore is 81', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      u = u.updateMetadata({ riskScore: 81 });
      expect(policy.canPerformSensitiveOperation(u)).toBe(false);
    });

    test('returns true when accountLockedUntil is exactly now', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      const now = new Date();
      u = u.updateMetadata({ accountLockedUntil: now });
      expect(policy.canPerformSensitiveOperation(u)).toBe(true);
    });
  });

  describe('canChangePassword', () => {
    test('returns false when user is inactive', () => {
      const u = makeUser().deactivate();
      expect(policy.canChangePassword(u)).toBe(false);
    });

    test('returns true when passwordChangeRequired is true', () => {
      const needChange = makeUser().updateMetadata({ passwordChangeRequired: true });
      expect(policy.canChangePassword(needChange)).toBe(true);
    });

    test('returns true when last password change was 5 days ago', () => {
      const recentlyChanged = makeUser().updateMetadata({ lastPasswordChange: new Date(Date.now() - 5 * 24 * 3600 * 1000) });
      expect(policy.canChangePassword(recentlyChanged)).toBe(true);
    });

    test('returns true when lastPasswordChange is undefined', () => {
      const u = makeUser().updateMetadata({ lastPasswordChange: undefined });
      expect(policy.canChangePassword(u)).toBe(true);
    });

    test('returns false when last password change was exactly 90 days ago', () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
      const u = makeUser().updateMetadata({ lastPasswordChange: ninetyDaysAgo });
      expect(policy.canChangePassword(u)).toBe(false);
    });

    test('returns true when last password change was 89 days ago', () => {
      const eightyNineDaysAgo = new Date(Date.now() - 89 * 24 * 3600 * 1000);
      const u = makeUser().updateMetadata({ lastPasswordChange: eightyNineDaysAgo });
      expect(policy.canChangePassword(u)).toBe(true);
    });
  });

  describe('canEnableTwoFactor', () => {
    test('returns true when user is verified and active', () => {
      const u = makeUser().verifyEmail().verifyPhone();
      expect(policy.canEnableTwoFactor(u)).toBe(true);
    });

    test('returns false when user is not verified', () => {
      const u = makeUser();
      expect(policy.canEnableTwoFactor(u)).toBe(false);
    });

    test('returns false when user is inactive', () => {
      const u = makeUser().verifyEmail().verifyPhone().deactivate();
      expect(policy.canEnableTwoFactor(u)).toBe(false);
    });
  });

  describe('isSuspiciousEmail', () => {
    test('returns true for disposable email domains', () => {
      expect(policy.isSuspiciousEmail('x@10minutemail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('x@tempmail.org')).toBe(true);
      expect(policy.isSuspiciousEmail('x@guerrillamail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('x@throwaway.email')).toBe(true);
      expect(policy.isSuspiciousEmail('x@mailinator.com')).toBe(true);
    });

    test('returns true for suspicious patterns', () => {
      expect(policy.isSuspiciousEmail('test+123@gmail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('temp123@gmail.com')).toBe(true);
      expect(policy.isSuspiciousEmail('throwaway456@gmail.com')).toBe(true);
    });

    test('returns false for normal emails', () => {
      expect(policy.isSuspiciousEmail('normal@gmail.com')).toBe(false);
      expect(policy.isSuspiciousEmail('user@company.com')).toBe(false);
    });

    test('handles case insensitivity', () => {
      expect(policy.isSuspiciousEmail('X@10MINUTEMAIL.COM')).toBe(true);
      expect(policy.isSuspiciousEmail('TEST+123@GMAIL.COM')).toBe(true);
    });

    test('handles emails without domain', () => {
      expect(policy.isSuspiciousEmail('nodomain')).toBe(false);
    });
  });

  describe('isSuspiciousPhoneNumber', () => {
    test('returns false for valid Tanzanian numbers', () => {
      expect(policy.isSuspiciousPhoneNumber('+2557112345678')).toBe(false);
      expect(policy.isSuspiciousPhoneNumber('+2556112345678')).toBe(false);
      expect(policy.isSuspiciousPhoneNumber('+2552112345678')).toBe(false);
      expect(policy.isSuspiciousPhoneNumber('2557112345678')).toBe(false);
    });

    test('returns true for non-Tanzanian numbers', () => {
      expect(policy.isSuspiciousPhoneNumber('+12223334444')).toBe(true);
      expect(policy.isSuspiciousPhoneNumber('+441234567890')).toBe(true);
    });

    test('returns true for invalid Tanzanian formats', () => {
      expect(policy.isSuspiciousPhoneNumber('+255812345678')).toBe(true);
      expect(policy.isSuspiciousPhoneNumber('+25571234567')).toBe(true);
    });
  });

  describe('isRateLimited', () => {
    test('returns false for any identifier', () => {
      expect(policy.isRateLimited('user@example.com')).toBe(false);
      expect(policy.isRateLimited('192.168.1.1')).toBe(false);
    });
  });

  describe('canPerformFinancialOperation', () => {
    test('returns false when user is inactive', () => {
      const u = makeUser().deactivate();
      expect(policy.canPerformFinancialOperation(u)).toBe(false);
    });

    test('returns false when user is not verified', () => {
      const u = makeUser();
      expect(policy.canPerformFinancialOperation(u)).toBe(false);
    });

    test('returns false when risk score exceeds 50', () => {
      const highRisk = makeUser().verifyEmail().verifyPhone().updateMetadata({ riskScore: 60 });
      expect(policy.canPerformFinancialOperation(highRisk)).toBe(false);
    });

    test('returns true when all conditions are met', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      u = u.updateMetadata({ riskScore: 30 });
      expect(policy.canPerformFinancialOperation(u)).toBe(true);
    });

    test('returns true when riskScore is exactly 50', () => {
      let u = makeUser().verifyEmail().verifyPhone();
      u = u.updateMetadata({ riskScore: 50 });
      expect(policy.canPerformFinancialOperation(u)).toBe(true);
    });
  });

  describe('canPerformHighValueTransaction', () => {
    test('returns false when user is inactive', () => {
      const u = makeUser().deactivate();
      expect(policy.canPerformHighValueTransaction(u, 1000)).toBe(false);
    });

    test('returns false when risk score exceeds 60', () => {
      const highRisk = makeUser().updateMetadata({ riskScore: 70 });
      expect(policy.canPerformHighValueTransaction(highRisk, 1000)).toBe(false);
    });

    test('returns true when all conditions are met', () => {
      const u = makeUser().updateMetadata({ riskScore: 50 });
      expect(policy.canPerformHighValueTransaction(u, 1000)).toBe(true);
    });

    test('returns true when riskScore is exactly 60', () => {
      const u = makeUser().updateMetadata({ riskScore: 60 });
      expect(policy.canPerformHighValueTransaction(u, 1000)).toBe(true);
    });
  });

  describe('isSecureSession', () => {
    beforeEach(() => {
      redisState.clear();
      redisClient.incr.mockClear();
      redisClient.expire.mockClear();
      prismaMock.user_TrustedDevice.findFirst.mockReset();
    });

    test('returns false when IP exceeds attempt threshold', async () => {
      const user = makeUser();
      redisState.set('security:ip:8.8.8.8:attempts', 9);
      await expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x' })).resolves.toBe(false);
    });

    test('returns false for unusual location with high risk score', async () => {
      const user = makeUser().updateMetadata({ riskScore: 50 });
      await expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x', location: 'Unknown' })).resolves.toBe(false);
    });

    test('returns true for safe IP and no location', async () => {
      const user = makeUser();
      await expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x' })).resolves.toBe(true);
    });

    test('returns true for safe IP and location with low risk', async () => {
      const user = makeUser().updateMetadata({ riskScore: 20 });
      await expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x', location: 'Dar es Salaam' })).resolves.toBe(true);
    });

    test('returns true when trustedDeviceCount is 1 and device is known', async () => {
      const user = makeUser().updateMetadata({ trustedDeviceCount: 1 });
      prismaMock.user_TrustedDevice.findFirst.mockResolvedValueOnce({ id: 'device-1' });
      await expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x' })).resolves.toBe(true);
    });

    test('returns true for location with riskScore exactly 40', async () => {
      const user = makeUser().updateMetadata({ riskScore: 40 });
      await expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x', location: 'Dar es Salaam' })).resolves.toBe(true);
    });

    test('returns false for location with riskScore 41', async () => {
      const user = makeUser().updateMetadata({ riskScore: 41 });
      await expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x', location: 'Dar es Salaam' })).resolves.toBe(false);
    });
  });

  describe('canAccessAdminFeatures', () => {
    test('returns false when user is not SYSTEM role', () => {
      const u = makeUser({ role: UserRole.BUYER });
      expect(policy.canAccessAdminFeatures(u)).toBe(false);
    });

    test('returns false when user is inactive', () => {
      const u = makeUser({ role: UserRole.SYSTEM }).deactivate();
      expect(policy.canAccessAdminFeatures(u)).toBe(false);
    });

    test('returns false when risk score exceeds 30', () => {
      const u = makeUser({ role: UserRole.SYSTEM }).updateMetadata({ riskScore: 40 });
      expect(policy.canAccessAdminFeatures(u)).toBe(false);
    });

    test('returns true when all conditions are met', () => {
      const u = makeUser({ role: UserRole.SYSTEM }).updateMetadata({ riskScore: 20 });
      expect(policy.canAccessAdminFeatures(u)).toBe(true);
    });

    test('returns true when riskScore is exactly 30', () => {
      const u = makeUser({ role: UserRole.SYSTEM }).updateMetadata({ riskScore: 30 });
      expect(policy.canAccessAdminFeatures(u)).toBe(true);
    });
  });

  describe('evaluate', () => {
    test('calls canPerformSensitiveOperation with single User argument', () => {
      const u = makeUser().verifyEmail().verifyPhone();
      expect(policy.evaluate(u)).toBe(policy.canPerformSensitiveOperation(u));
    });

    test('calls canPerformHighValueTransaction with User and number arguments', () => {
      const u = makeUser();
      expect(policy.evaluate(u, 100)).toBe(policy.canPerformHighValueTransaction(u, 100));
    });

    test('returns false for invalid arguments', () => {
      expect(policy.evaluate('invalid')).toBe(false);
      expect(policy.evaluate()).toBe(false);
      expect(policy.evaluate({}, 'invalid')).toBe(false);
    });
  });
});
