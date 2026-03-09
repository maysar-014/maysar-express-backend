import { TwoFactorPolicy } from './two-factor.policy';

describe('TwoFactorPolicy', () => {
  it('canEnableTwoFactor allows only supported active statuses', () => {
    expect(TwoFactorPolicy.canEnableTwoFactor({ status: 'active' })).toBe(true);
    expect(TwoFactorPolicy.canEnableTwoFactor({ status: 'ACTIVE' })).toBe(true);
    expect(TwoFactorPolicy.canEnableTwoFactor({ status: 'active_confirmed' })).toBe(true);
    expect(TwoFactorPolicy.canEnableTwoFactor({ status: 'suspended' })).toBe(false);
  });

  it('canDisableTwoFactor currently allows all users', () => {
    expect(TwoFactorPolicy.canDisableTwoFactor({ role: 'admin' })).toBe(true);
    expect(TwoFactorPolicy.canDisableTwoFactor({ role: 'buyer' })).toBe(true);
  });

  it('requiresTwoFactor enforces sensitive roles (case-insensitive)', () => {
    expect(TwoFactorPolicy.requiresTwoFactor('admin')).toBe(true);
    expect(TwoFactorPolicy.requiresTwoFactor('SYSTEM')).toBe(true);
    expect(TwoFactorPolicy.requiresTwoFactor('seller')).toBe(true);
    expect(TwoFactorPolicy.requiresTwoFactor('buyer')).toBe(false);
  });

  it('canUseBackupCode requires remaining codes', () => {
    expect(TwoFactorPolicy.canUseBackupCode(1)).toBe(true);
    expect(TwoFactorPolicy.canUseBackupCode(0)).toBe(false);
    expect(TwoFactorPolicy.canUseBackupCode(-1)).toBe(false);
  });

  it('isValidMethod accepts only totp and sms methods', () => {
    expect(TwoFactorPolicy.isValidMethod('totp')).toBe(true);
    expect(TwoFactorPolicy.isValidMethod('SMS')).toBe(true);
    expect(TwoFactorPolicy.isValidMethod('email')).toBe(false);
  });
});
