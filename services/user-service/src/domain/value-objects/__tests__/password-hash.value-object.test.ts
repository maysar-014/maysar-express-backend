import { PasswordHash } from '../password-hash.value-object';

describe('PasswordHash Value Object', () => {
  const origSalt = process.env.PASSWORD_SALT;

  beforeAll(() => {
    process.env.PASSWORD_SALT = 'test_salt';
  });

  afterAll(() => {
    process.env.PASSWORD_SALT = origSalt;
  });

  it('validates password strength and requirements', () => {
    expect(PasswordHash.isValidPassword('Short1!')).toBe(false);
    expect(PasswordHash.isValidPassword('GoodPass1!')).toBe(true);
  });

  it('computes password strength score', () => {
    expect(PasswordHash.getPasswordStrength('')).toBe(0);
    expect(PasswordHash.getPasswordStrength('weakpass')).toBeGreaterThanOrEqual(1);
    expect(PasswordHash.getPasswordStrength('GoodPass1!')).toBeGreaterThanOrEqual(3);
  });

  it('creates hash from plain password and verifies it', async () => {
    const pw = 'GoodPass1!';
    const ph = await PasswordHash.fromPlainPassword(pw);
    expect(ph.algorithm).toBe('bcrypt');
    expect(ph.toString()).toContain('bcrypt');

    const ok = await ph.verifyPassword(pw);
    expect(ok).toBe(true);

    const wrong = await ph.verifyPassword('BadPass!1');
    expect(wrong).toBe(false);
  });

  it('creates from existing hash and compares equality', async () => {
    const pw = 'GoodPass1!';
    const ph = await PasswordHash.fromPlainPassword(pw);
    const same = PasswordHash.fromHash(ph.value, ph.algorithm);
    expect(same.equals(ph)).toBe(true);
    expect(same.needsRehash()).toBe(true); // default algorithm is bcrypt
  });
});
