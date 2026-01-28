import { UserSecurityPolicy } from '../user-security.policy';
import { User } from '../../entities/user.entity';
import { Email } from '../../value-objects/email.value-object';
import { PhoneNumber } from '../../value-objects/phone-number.value-object';
import { UserRole } from '../../types/user.types';

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

  test('canPerformSensitiveOperation denies inactive, unverified, locked, high risk', () => {
    const inactive = makeUser().deactivate();
    expect(policy.canPerformSensitiveOperation(inactive)).toBe(false);

    const unverified = makeUser();
    expect(policy.canPerformSensitiveOperation(unverified)).toBe(false);

    const locked = makeUser().updateMetadata({ accountLockedUntil: new Date(Date.now() + 10000) });
    expect(policy.canPerformSensitiveOperation(locked)).toBe(false);

    const risky = makeUser().updateMetadata({ riskScore: 90 });
    expect(policy.canPerformSensitiveOperation(risky)).toBe(false);
  });

  test('canChangePassword logic', () => {
    const u = makeUser().deactivate();
    expect(policy.canChangePassword(u)).toBe(false);

    const needChange = makeUser().updateMetadata({ passwordChangeRequired: true });
    expect(policy.canChangePassword(needChange)).toBe(true);

    const recentlyChanged = makeUser().updateMetadata({ lastPasswordChange: new Date(Date.now() - 5 * 24 * 3600 * 1000) });
    expect(policy.canChangePassword(recentlyChanged)).toBe(true);
  });

  test('canEnableTwoFactor and canPerformFinancialOperation', () => {
    let u = makeUser();
    u = u.verifyEmail().verifyPhone();
    expect(policy.canEnableTwoFactor(u)).toBe(true);
    expect(policy.canPerformFinancialOperation(u)).toBe(true);

    const highRisk = makeUser().verifyEmail().verifyPhone().updateMetadata({ riskScore: 60 });
    expect(policy.canPerformFinancialOperation(highRisk)).toBe(false);
  });

  test('isSuspiciousEmail and isSuspiciousPhoneNumber', () => {
    expect(policy.isSuspiciousEmail('x@10minutemail.com')).toBe(true);
    expect(policy.isSuspiciousEmail('normal@gmail.com')).toBe(false);

      expect(policy.isSuspiciousPhoneNumber('+12223334444')).toBe(true); // non-TZ
      expect(policy.isSuspiciousPhoneNumber('+2557112345678')).toBe(false);
  });

  test('canPerformHighValueTransaction and canAccessAdminFeatures and evaluate', () => {
    const u = makeUser({ status: 'active', metadata: { riskScore: 10 } });
    expect(policy.canPerformHighValueTransaction(u, 1000)).toBe(true);

    const admin = makeUser({ role: UserRole.SYSTEM, status: 'active' });
    expect(policy.canAccessAdminFeatures(admin)).toBe(true);

    expect(policy.evaluate(u)).toBe(policy.canPerformSensitiveOperation(u));
    expect(policy.evaluate(u, 100)).toBe(policy.canPerformHighValueTransaction(u, 100));
  });

  test('isSecureSession checks suspicious IP and unusual location', () => {
    const user = makeUser({ metadata: { riskScore: 50 } });
    expect(policy.isSecureSession(user, { ipAddress: '10.0.0.1', userAgent: 'x' })).toBe(false);
      expect(policy.isSecureSession(user, { ipAddress: '8.8.8.8', userAgent: 'x', location: 'Unknown' })).toBe(false);
  });
});
