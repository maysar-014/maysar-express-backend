import { PasswordHash } from '../password-hash.value-object';

describe('PasswordHash Value Object - extra branches', () => {
  const origSalt = process.env.PASSWORD_SALT;
  beforeAll(() => { process.env.PASSWORD_SALT = 'test_salt2'; });
  afterAll(() => { process.env.PASSWORD_SALT = origSalt; });

  it('getPasswordStrength extremes and argon2 rehash logic', async () => {
    expect(PasswordHash.getPasswordStrength('short')).toBeGreaterThanOrEqual(0);
    const strong = 'VeryGoodPass123!@#';
    expect(PasswordHash.getPasswordStrength(strong)).toBeGreaterThanOrEqual(4);

    const ph = await PasswordHash.fromPlainPassword('GoodPass1!');
    const fromHash = PasswordHash.fromHash(ph.value, 'argon2');
    expect(fromHash.needsRehash()).toBe(false);
  });
});
