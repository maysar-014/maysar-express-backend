import { UserValidationService } from '../user-validation.service';

describe('UserValidationService', () => {
  let svc: UserValidationService;

  beforeEach(() => {
    svc = new UserValidationService();
  });

  const makeUser = (overrides: any = {}) => {
    const base = {
      validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      getAge: jest.fn().mockReturnValue(30),
      email: { toString: () => 'test@example.com' },
      phoneNumber: { isTanzanian: () => false, toString: () => '+255712345678' },
      addresses: [],
      hasBusiness: jest.fn().mockReturnValue(false),
      role: 'buyer',
      isAdult: jest.fn().mockReturnValue(true),
      emailVerified: true,
      phoneVerified: true,
      status: 'active',
      isActive: jest.fn().mockReturnValue(true),
      isVerified: jest.fn().mockReturnValue(true),
      metadata: { accountLockedUntil: null, loginAttempts: 0 },
    };

    return Object.assign(base, overrides);
  };

  describe('validateForRegistration', () => {
    it('returns valid when user meets requirements', () => {
      const user = makeUser({
        phoneNumber: { isTanzanian: () => false, toString: () => '+15551234567' },
        addresses: []
      });

      const res = svc.validateForRegistration(user as any);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('detects invalid email format', () => {
      const user = makeUser({ email: { toString: () => 'not-an-email' } });
      const res = svc.validateForRegistration(user as any);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Invalid email format');
    });

    it('rejects underage users', () => {
      const user = makeUser({ getAge: jest.fn().mockReturnValue(16) });
      const res = svc.validateForRegistration(user as any);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Users must be at least 18 years old to register');
    });

    it('rejects invalid tanzanian phone numbers', () => {
      const user = makeUser({ phoneNumber: { isTanzanian: () => true, toString: () => '+255123' } });
      const res = svc.validateForRegistration(user as any);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Invalid Tanzanian phone number format');
    });

    it('requires valid tanzanian address when present', () => {
      const badAddr = { isTanzanian: () => true, street: '', city: '', country: '', postalCode: '' };
      const user = makeUser({ addresses: [badAddr] });
      const res = svc.validateForRegistration(user as any);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Tanzanian users must have at least one valid Tanzanian address');
    });
  });

  describe('validateUser', () => {
    it('throws when entity validation fails', () => {
      const user = makeUser({ validate: jest.fn().mockReturnValue({ isValid: false, errors: ['bad'] }) });
      expect(() => svc.validateUser(user as any)).toThrow(/User validation failed/);
    });
  });

  describe('validateBusinessUser', () => {
    it('passes for valid business user', () => {
      const user = makeUser({ hasBusiness: () => true, role: 'seller', isAdult: () => true });
      expect(() => svc.validateBusinessUser(user as any)).not.toThrow();
    });

    it('throws when missing business', () => {
      const user = makeUser({ hasBusiness: () => false });
      expect(() => svc.validateBusinessUser(user as any)).toThrow('Business users must have a business ID');
    });

    it('throws when role is not seller', () => {
      const user = makeUser({ hasBusiness: () => true, role: 'buyer' });
      expect(() => svc.validateBusinessUser(user as any)).toThrow('Business users must have seller role');
    });

    it('throws when not adult', () => {
      const user = makeUser({ hasBusiness: () => true, role: 'seller', isAdult: () => false });
      expect(() => svc.validateBusinessUser(user as any)).toThrow('Business users must be adults');
    });
  });

  describe('validateSecurityRequirements', () => {
    it('throws if email not verified', () => {
      const user = makeUser({ emailVerified: false });
      expect(() => svc.validateSecurityRequirements(user as any)).toThrow('User must verify email address');
    });

    it('throws if phone not verified', () => {
      const user = makeUser({ emailVerified: true, phoneVerified: false });
      expect(() => svc.validateSecurityRequirements(user as any)).toThrow('User must verify phone number');
    });

    it('throws if status not active', () => {
      const user = makeUser({ emailVerified: true, phoneVerified: true, status: 'suspended' });
      expect(() => svc.validateSecurityRequirements(user as any)).toThrow('User account must be active');
    });
  });

  describe('validateAgeRequirements', () => {
    it('throws when below custom minimum age', () => {
      const user = makeUser({ isAdult: () => false });
      expect(() => svc.validateAgeRequirements(user as any, 18)).toThrow('User must be at least 18 years old');
    });

    it('throws when below default minimum (13)', () => {
      const user = makeUser({ isAdult: () => false, getAge: () => 12 });
      expect(() => svc.validateAgeRequirements(user as any, 13)).toThrow('User must be at least 13 years old');
    });

    it('passes when adult', () => {
      const user = makeUser({ isAdult: () => true });
      expect(() => svc.validateAgeRequirements(user as any, 18)).not.toThrow();
    });
  });

  describe('validateForLogin', () => {
    it('allows login for valid user', () => {
      const user = makeUser({ isActive: () => true, isVerified: () => true, metadata: { accountLockedUntil: null, loginAttempts: 0 } });
      const res = svc.validateForLogin(user as any);
      expect(res.canLogin).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('blocks inactive users', () => {
      const user = makeUser({ isActive: () => false, isVerified: () => true, metadata: { accountLockedUntil: null, loginAttempts: 0 } });
      const res = svc.validateForLogin(user as any);
      expect(res.canLogin).toBe(false);
      expect(res.errors).toContain('Account is not active');
    });

    it('blocks unverified users', () => {
      const user = makeUser({ isActive: () => true, isVerified: () => false, metadata: { accountLockedUntil: null, loginAttempts: 0 } });
      const res = svc.validateForLogin(user as any);
      expect(res.canLogin).toBe(false);
      expect(res.errors).toContain('Account is not verified');
    });

    it('blocks when account locked', () => {
      const future = new Date(Date.now() + 1000000);
      const user = makeUser({ isActive: () => true, isVerified: () => true, metadata: { accountLockedUntil: future, loginAttempts: 0 } });
      const res = svc.validateForLogin(user as any);
      expect(res.canLogin).toBe(false);
      expect(res.errors).toContain('Account is temporarily locked');
    });

    it('blocks when too many attempts', () => {
      const user = makeUser({ isActive: () => true, isVerified: () => true, metadata: { accountLockedUntil: null, loginAttempts: 6 } });
      const res = svc.validateForLogin(user as any);
      expect(res.canLogin).toBe(false);
      expect(res.errors).toContain('Too many failed login attempts');
    });
  });

  describe('validateForBusinessRegistration', () => {
    it('validates a good business registration', () => {
      const addr = { type: 'business', street: 'S', city: 'C', country: 'T' };
      const user = makeUser({ isAdult: () => true, isVerified: () => true, addresses: [addr] });
      const res = svc.validateForBusinessRegistration(user as any, { businessName: 'X', businessType: 'Y' });
      expect(res.isValid).toBe(true);
    });

    it('rejects invalid business info', () => {
      const addr = { type: 'business', street: 'S', city: 'C', country: 'T' };
      const user = makeUser({ isAdult: () => true, isVerified: () => true, addresses: [addr] });
      const res = svc.validateForBusinessRegistration(user as any, { businessName: '', businessType: '' });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Invalid business information');
    });
  });

  describe('validateMetadataUpdate', () => {
    it('rejects out of bounds risk score', () => {
      const res = svc.validateMetadataUpdate({} as any, { riskScore: 101 });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Risk score must be between 0 and 100');
    });

    it('rejects negative login attempts', () => {
      const res = svc.validateMetadataUpdate({} as any, { loginAttempts: -1 });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Login attempts cannot be negative');
    });

    it('rejects negative account age', () => {
      const res = svc.validateMetadataUpdate({} as any, { accountAge: -5 });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Account age cannot be negative');
    });

    it('accepts valid metadata', () => {
      const res = svc.validateMetadataUpdate({} as any, { riskScore: 50, loginAttempts: 1, accountAge: 10 });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });
});
