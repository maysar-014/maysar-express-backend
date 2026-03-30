import { GetUserUseCase } from '../get-user.use-case';
import { SearchUsersUseCase } from '../search-users.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';
import { UserPolicies } from '../../../domain/policies/user-policies';

describe('GetUserUseCase', () => {

  it('returns not found when missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new GetUserUseCase(repo);
    const out = await sut.execute({ userId: 'x' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('denies access when policies forbid', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    jest.spyOn(UserPolicies as any, 'canSearchUsers').mockReturnValue({ allowed: false, reason: 'No' });

    const sut = new GetUserUseCase(repo);
    const out = await sut.execute({ userId: 'u1', requestingUserId: 'someone' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('No');
  });

  it('returns user when allowed', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const requester = User.create({ id: 'admin-user', email: Email.create('admin@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'Admin', lastName: 'User', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(requester) };
    jest.spyOn(UserPolicies as any, 'canSearchUsers').mockReturnValue({ allowed: true });

    const sut = new GetUserUseCase(repo);
    const out = await sut.execute({ userId: 'u1', requestingUserId: 'admin-user' });
    expect(out.success).toBe(true);
    expect(out.user).toBeDefined();
  });

  it('allows admin roles without invoking policy search', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const policySpy = jest.spyOn(UserPolicies as any, 'canSearchUsers');
    policySpy.mockClear();

    const sut = new GetUserUseCase(repo);
    const out = await sut.execute({ userId: 'u1', requestingUserId: 'admin-user', requestingUserRoles: ['admin'] });
    expect(out.success).toBe(true);
    expect(policySpy).not.toHaveBeenCalled();
  });
});

describe('SearchUsersUseCase', () => {
  it('denies when requesting user not found', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new SearchUsersUseCase(repo);
    const out = await sut.execute({ filters: {}, pagination: { page: 1, limit: 10 }, requestingUserId: 'x' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Requesting user not found');
  });

  it('returns empty results when no users found', async () => {
    const admin = User.create({ id: 'admin', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.SYSTEM });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(admin),
      search: jest.fn().mockResolvedValue([])
    };

    const sut = new SearchUsersUseCase(repo);
    const out = await sut.execute({ filters: {}, pagination: { page: 1, limit: 10 }, requestingUserId: 'admin' });
    expect(out.success).toBe(true);
    expect(Array.isArray(out.users)).toBe(true);
  });
});
