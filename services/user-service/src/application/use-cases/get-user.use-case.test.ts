import { GetUserUseCase } from './get-user.use-case';
import { UserPolicies } from '../../domain/policies/user-policies';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../domain/types/user.types';

const createUser = (id = 'user-1') =>
  User.create({
    id,
    email: Email.create(`${id}@gmail.com`),
    phoneNumber: PhoneNumber.create('+255712345678'),
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.BUYER
  });

describe('GetUserUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns not found when repository does not contain user', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new GetUserUseCase(repo as never);

    const result = await useCase.execute({ userId: 'missing' });

    expect(result).toEqual({
      user: null,
      success: false,
      message: 'User not found'
    });
  });

  it('allows self-access and bypasses policy denial path', async () => {
    const user = createUser('self-user');
    const repo = { findById: jest.fn().mockResolvedValue(user) };
    const policySpy = jest.spyOn(UserPolicies, 'canSearchUsers');
    const useCase = new GetUserUseCase(repo as never);

    const result = await useCase.execute({
      userId: 'self-user',
      requestingUserId: 'self-user',
      fields: ['id', 'email']
    });

    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('self-user');
    expect(policySpy).not.toHaveBeenCalled();
  });

  it('denies access when policies do not allow it', async () => {
    const user = createUser('target-user');
    const repo = { findById: jest.fn().mockResolvedValue(user) };
    jest.spyOn(UserPolicies, 'canSearchUsers').mockReturnValue({
      allowed: false,
      reason: 'Insufficient permissions'
    });
    const useCase = new GetUserUseCase(repo as never);

    const result = await useCase.execute({
      userId: 'target-user',
      requestingUserId: 'other-user'
    });

    expect(result).toEqual({
      user: null,
      success: false,
      message: 'Insufficient permissions'
    });
  });

  it('returns generic failure message when repository throws', async () => {
    const repo = { findById: jest.fn().mockRejectedValue(new Error('DB unavailable')) };
    const useCase = new GetUserUseCase(repo as never);

    const result = await useCase.execute({
      userId: 'u-1',
      requestingUserId: 'u-2'
    });

    expect(result).toEqual({
      user: null,
      success: false,
      message: 'Failed to retrieve user'
    });
  });

  it('allows admin roles from upstream auth context', async () => {
    const targetUser = createUser('target-user');
    const requester = createUser('admin-user');
    const repo = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(requester)
    };
    const policySpy = jest.spyOn(UserPolicies, 'canSearchUsers');
    const useCase = new GetUserUseCase(repo as never);

    const result = await useCase.execute({
      userId: 'target-user',
      requestingUserId: 'admin-user',
      requestingUserRoles: ['admin']
    });

    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('target-user');
    expect(policySpy).not.toHaveBeenCalled();
  });
});
