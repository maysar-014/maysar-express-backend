import { AuthenticationPolicy } from '../authentication.policy';
import { User } from '../../entities/user.entity';

describe('AuthenticationPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createUser = (overrides: any = {}) => ({
    id: 'user-1',
    email: 'test@example.com',
    role: 'buyer',
    status: 'ACTIVE',
    profile: {},
    canAuthenticate: jest.fn().mockReturnValue(true),
    canChangePassword: jest.fn().mockReturnValue(true),
    isVerified: jest.fn().mockReturnValue(true),
    canAccessSystem: jest.fn().mockReturnValue(true),
    ...overrides
  } as any);

  describe('canAuthenticate', () => {
    it('should allow active user to authenticate', () => {
      const user = createUser();
      expect(AuthenticationPolicy.canAuthenticate(user)).toBe(true);
    });

    it('should deny authentication for blocked user', () => {
      const user = createUser({ canAuthenticate: jest.fn().mockReturnValue(false) });
      expect(AuthenticationPolicy.canAuthenticate(user)).toBe(false);
    });
  });

  describe('canChangePassword', () => {
    it('should allow active user to change password', () => {
      const user = createUser();
      expect(AuthenticationPolicy.canChangePassword(user)).toBe(true);
    });

    it('should deny password change for suspended user', () => {
      const user = createUser({ canChangePassword: jest.fn().mockReturnValue(false) });
      expect(AuthenticationPolicy.canChangePassword(user)).toBe(false);
    });
  });

  describe('canResetPassword', () => {
    it('should allow active user to reset password', () => {
      const user = createUser({ status: 'ACTIVE' });
      expect(AuthenticationPolicy.canResetPassword(user)).toBe(true);
    });

    it('should allow suspended user to reset password', () => {
      const user = createUser({ status: 'SUSPENDED' });
      expect(AuthenticationPolicy.canResetPassword(user)).toBe(true);
    });

    it('should deny password reset for deactivated user', () => {
      const user = createUser({ status: 'DEACTIVATED' });
      expect(AuthenticationPolicy.canResetPassword(user)).toBe(false);
    });
  });

  describe('canEnableTwoFactor', () => {
    it('should allow verified active user to enable 2FA', () => {
      const user = createUser({ status: 'ACTIVE', isVerified: jest.fn().mockReturnValue(true) });
      expect(AuthenticationPolicy.canEnableTwoFactor(user)).toBe(true);
    });

    it('should deny 2FA for unverified user', () => {
      const user = createUser({ status: 'ACTIVE', isVerified: jest.fn().mockReturnValue(false) });
      expect(AuthenticationPolicy.canEnableTwoFactor(user)).toBe(false);
    });

    it('should deny 2FA for suspended user', () => {
      const user = createUser({ status: 'SUSPENDED', isVerified: jest.fn().mockReturnValue(true) });
      expect(AuthenticationPolicy.canEnableTwoFactor(user)).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('should allow system user to manage any user', () => {
      const manager = createUser({ role: 'system' });
      const target = createUser({ role: 'buyer' });
      expect(AuthenticationPolicy.canManageUsers(manager, target)).toBe(true);
    });

    it('should allow enabler to manage non-system users', () => {
      const manager = createUser({ role: 'enabler' });
      const target = createUser({ role: 'seller' });
      expect(AuthenticationPolicy.canManageUsers(manager, target)).toBe(true);
    });

    it('should deny enabler managing system users', () => {
      const manager = createUser({ role: 'enabler' });
      const target = createUser({ role: 'system' });
      expect(AuthenticationPolicy.canManageUsers(manager, target)).toBe(false);
    });

    it('should deny enabler managing other enablers', () => {
      const manager = createUser({ role: 'enabler' });
      const target = createUser({ role: 'enabler' });
      expect(AuthenticationPolicy.canManageUsers(manager, target)).toBe(false);
    });

    it('should deny buyer managing users', () => {
      const manager = createUser({ role: 'buyer' });
      const target = createUser({ role: 'seller' });
      expect(AuthenticationPolicy.canManageUsers(manager, target)).toBe(false);
    });
  });

  describe('canChangeUserRole', () => {
    it('should allow system user to change non-system user role', () => {
      const changer = createUser({ role: 'system' });
      const target = createUser({ role: 'buyer' });
      expect(AuthenticationPolicy.canChangeUserRole(changer, target, 'seller')).toBe(true);
    });

    it('should deny non-system user changing roles', () => {
      const changer = createUser({ role: 'enabler' });
      const target = createUser({ role: 'buyer' });
      expect(AuthenticationPolicy.canChangeUserRole(changer, target, 'seller')).toBe(false);
    });

    it('should deny changing system user role', () => {
      const changer = createUser({ role: 'system' });
      const target = createUser({ role: 'system' });
      expect(AuthenticationPolicy.canChangeUserRole(changer, target, 'enabler')).toBe(false);
    });

    it('should deny setting role to system', () => {
      const changer = createUser({ role: 'system' });
      const target = createUser({ role: 'buyer' });
      expect(AuthenticationPolicy.canChangeUserRole(changer, target, 'system')).toBe(false);
    });
  });

  describe('canCreateUserWithRole', () => {
    it('should allow system to create non-system roles', () => {
      const creator = createUser({ role: 'system' });
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'buyer')).toBe(true);
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'enabler')).toBe(true);
    });

    it('should deny system creating system role', () => {
      const creator = createUser({ role: 'system' });
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'system')).toBe(false);
    });

    it('should allow enabler to create standard roles', () => {
      const creator = createUser({ role: 'enabler' });
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'buyer')).toBe(true);
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'seller')).toBe(true);
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'supplier')).toBe(true);
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'courier')).toBe(true);
    });

    it('should deny enabler creating enabler or system roles', () => {
      const creator = createUser({ role: 'enabler' });
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'enabler')).toBe(false);
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'system')).toBe(false);
    });

    it('should deny buyer creating any role', () => {
      const creator = createUser({ role: 'buyer' });
      expect(AuthenticationPolicy.canCreateUserWithRole(creator, 'buyer')).toBe(false);
    });
  });
});
