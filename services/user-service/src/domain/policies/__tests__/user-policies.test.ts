import { UserPolicies } from '../user-policies';
import { Email } from '../../value-objects/email.value-object';
import { PhoneNumber } from '../../value-objects/phone-number.value-object';
import { UserRole, UserStatus } from '../../types/user.types';

describe('UserPolicies', () => {
  describe('canRegister', () => {
    test('allows trusted email', () => {
      const email = Email.create('john@gmail.com');
      const res = UserPolicies.canRegister(email);
      expect(res.allowed).toBe(true);
    });

    test('rejects untrusted email domain', () => {
      const email = Email.create('alice@example.com');
      const res = UserPolicies.canRegister(email);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Email domain not allowed');
    });

    test('rejects non-tanzanian phone when provided', () => {
      const email = Email.create('john@gmail.com');
      const phone = PhoneNumber.create('+12223334444');
      const res = UserPolicies.canRegister(email, phone);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Phone number must be Tanzanian');
    });
  });

  describe('canUpdateProfile', () => {
    const baseUser = {
      id: 'u1',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      email: Email.create('same@gmail.com'),
      phoneNumber: PhoneNumber.create('+255712345678')
    } as any;

    test('rejects when user not active', () => {
      const inactive = { ...baseUser, status: UserStatus.INACTIVE };
      const res = UserPolicies.canUpdateProfile(inactive, {});
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('User account is not active');
    });

    test('rejects email changes through profile update', () => {
      const res = UserPolicies.canUpdateProfile(baseUser, { email: 'other@gmail.com' });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Email updates not allowed through profile update');
    });

    test('rejects under-13 dateOfBirth', () => {
      const youngDob = new Date();
      const year = new Date().getFullYear() - 10;
      youngDob.setFullYear(year);
      const res = UserPolicies.canUpdateProfile(baseUser, { dateOfBirth: youngDob.toISOString() });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Users must be at least 13 years old');
    });
  });

  describe('role and status changes', () => {
    test('canChangeRole enforces permissions and transitions', () => {
      const current = { role: UserRole.BUYER } as any;
      const target = { role: UserRole.BUYER } as any;
      const resNoPerm = UserPolicies.canChangeRole(current, target, UserRole.SELLER);
      expect(resNoPerm.allowed).toBe(false);

      const admin = { role: UserRole.SYSTEM } as any;
      const targetSys = { role: UserRole.SYSTEM } as any;
      const resModifySys = UserPolicies.canChangeRole(admin, targetSys, UserRole.SELLER);
      expect(resModifySys.allowed).toBe(false);

      const okTarget = { role: UserRole.BUYER } as any;
      const resOk = UserPolicies.canChangeRole(admin, okTarget, UserRole.SELLER);
      expect(resOk.allowed).toBe(true);
    });

    test('canChangeStatus enforces allowed roles and invalid transitions', () => {
      const nonAdmin = { role: UserRole.BUYER } as any;
      const target = { role: UserRole.SELLER, status: UserStatus.ACTIVE } as any;
      const noPerm = UserPolicies.canChangeStatus(nonAdmin, target, UserStatus.SUSPENDED);
      expect(noPerm.allowed).toBe(false);

      const admin = { role: UserRole.SYSTEM } as any;
      const targetSys = { role: UserRole.SYSTEM, status: UserStatus.ACTIVE } as any;
      const cannotSuspendSys = UserPolicies.canChangeStatus(admin, targetSys, UserStatus.SUSPENDED);
      expect(cannotSuspendSys.allowed).toBe(false);

      const deactivated = { role: UserRole.SELLER, status: UserStatus.DEACTIVATED } as any;
      const invalidReactivate = UserPolicies.canChangeStatus(admin, deactivated, UserStatus.ACTIVE);
      expect(invalidReactivate.allowed).toBe(false);
    });
  });

  describe('canDeleteUser', () => {
    const system = { role: UserRole.SYSTEM } as any;
    test('only system can delete', () => {
      const normal = { role: UserRole.BUYER } as any;
      const target = { role: UserRole.SELLER, status: UserStatus.INACTIVE } as any;
      const res = UserPolicies.canDeleteUser(normal, target);
      expect(res.allowed).toBe(false);
    });

    test('cannot delete system admin or active users or recent activity', () => {
      const targetSys = { role: UserRole.SYSTEM, status: UserStatus.INACTIVE } as any;
      expect(UserPolicies.canDeleteUser(system, targetSys).allowed).toBe(false);

      const activeTarget = { role: UserRole.SELLER, status: UserStatus.ACTIVE } as any;
      expect(UserPolicies.canDeleteUser(system, activeTarget).allowed).toBe(false);

      const recent = { role: UserRole.SELLER, status: UserStatus.INACTIVE, lastLoginAt: new Date() } as any;
      expect(UserPolicies.canDeleteUser(system, recent).allowed).toBe(false);

      const oldLogin = new Date();
      oldLogin.setDate(oldLogin.getDate() - 200);
      const old = { role: UserRole.SELLER, status: UserStatus.INACTIVE, lastLoginAt: oldLogin } as any;
      expect(UserPolicies.canDeleteUser(system, old).allowed).toBe(true);
    });
  });

  describe('canRecoverAccount', () => {
    test('prefers email when present', () => {
      const email = Email.create('x@gmail.com');
      const res = UserPolicies.canRecoverAccount(email);
      expect(res.allowed).toBe(true);
      expect(res.method).toBe('email');
    });

    test('falls back to phone when email is falsy', () => {
      const phone = PhoneNumber.create('+255712345678');
      const res = UserPolicies.canRecoverAccount(null as any, phone);
      expect(res.allowed).toBe(true);
      expect(res.method).toBe('phone');
    });

    test('rejects when no valid method', () => {
      const res = UserPolicies.canRecoverAccount(null as any, PhoneNumber.create('+12223334444'));
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('No valid recovery method available');
    });
  });

  describe('bulk operations and search/export/analytics/preferences', () => {
    test('canPerformBulkOperation enforces limits and roles', () => {
      const noPerm = UserPolicies.canPerformBulkOperation({ role: UserRole.BUYER } as any, 'status_update', 2);
      expect(noPerm.allowed).toBe(false);

      const admin = { role: UserRole.SYSTEM } as any;
      const tooLarge = UserPolicies.canPerformBulkOperation(admin, 'deletion', 20);
      expect(tooLarge.allowed).toBe(false);

      const ok = UserPolicies.canPerformBulkOperation(admin, 'status_update', 50);
      expect(ok.allowed).toBe(true);
    });

    test('canSearchUsers restrictions', () => {
      const buyer = { role: UserRole.BUYER, id: 'me' } as any;
      const blocked = UserPolicies.canSearchUsers(buyer, { id: 'other' });
      expect(blocked.allowed).toBe(false);

      const admin = { role: UserRole.SYSTEM } as any;
      expect(UserPolicies.canSearchUsers(admin, {}).allowed).toBe(true);
    });

    test('canExportUserData cases', () => {
      const user = { id: 'u1', role: UserRole.BUYER } as any;
      const other = { id: 'u2', role: UserRole.SELLER } as any;
      expect(UserPolicies.canExportUserData(user, user).allowed).toBe(true);
      expect(UserPolicies.canExportUserData({ role: UserRole.SYSTEM } as any, other).allowed).toBe(true);
      expect(UserPolicies.canExportUserData(user, other).allowed).toBe(false);
    });

    test('validateUserPreferences returns errors for invalid inputs', () => {
      const invalidLang = UserPolicies.validateUserPreferences({ language: 'xx' });
      expect(invalidLang.valid).toBe(false);
      expect(invalidLang.errors).toContain('Language must be one of: en, sw, fr');

      const invalidTz = UserPolicies.validateUserPreferences({ timezone: 'Not/A_Zone' });
      expect(invalidTz.valid).toBe(false);
      expect(invalidTz.errors).toContain('Invalid timezone');

      const invalidQuiet = UserPolicies.validateUserPreferences({ quietHoursStart: '99:99', quietHoursEnd: 'aa:bb' });
      expect(invalidQuiet.valid).toBe(false);
      expect(invalidQuiet.errors).toContain('Quiet hours must be in HH:MM format');

      const ok = UserPolicies.validateUserPreferences({ language: 'en', timezone: 'UTC', quietHoursStart: '22:00', quietHoursEnd: '07:00' });
      expect(ok.valid).toBe(true);
    });

    test('canViewAnalytics role-based checks', () => {
      expect(UserPolicies.canViewAnalytics({ role: UserRole.SYSTEM } as any, 'anything').allowed).toBe(true);
      expect(UserPolicies.canViewAnalytics({ role: UserRole.ENABLER } as any, 'user_registration').allowed).toBe(false);
      expect(UserPolicies.canViewAnalytics({ role: UserRole.SELLER } as any, 'own_performance').allowed).toBe(true);
      expect(UserPolicies.canViewAnalytics({ role: UserRole.SELLER } as any, 'not_allowed').allowed).toBe(false);
    });
  });
});
