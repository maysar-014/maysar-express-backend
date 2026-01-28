import { UpdateUserUseCase } from '../update-user.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';
import * as UserPolicies from '../../../domain/policies/user-policies';

describe('UpdateUserUseCase', () => {
  const makeUser = (id = 'user-1') => User.create({
    id,
    email: Email.create('test@example.com'),
    phoneNumber: PhoneNumber.create('+255712345678'),
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.BUYER
  });

  it('returns not found when user does not exist', async () => {
    const repo: any = {
      findById: jest.fn().mockResolvedValue(null)
    };
    const publisher: any = { publish: jest.fn() };

    const sut = new UpdateUserUseCase(repo, publisher);

    const result = await sut.execute({ userId: 'missing', updates: {}, updatedBy: 'user-x' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('User not found');
  });

  it('returns permission denied when requester cannot update', async () => {
    const target = makeUser('target');
    const requester = makeUser('requester');

    const repo: any = {
      findById: jest.fn().mockImplementation(async (id: string) => id === 'target' ? target : requester)
    };
    const publisher: any = { publish: jest.fn() };

    const sut = new UpdateUserUseCase(repo, publisher);

    const result = await sut.execute({ userId: 'target', updates: { firstName: 'New' }, updatedBy: 'requester' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Insufficient permissions');
  });

  it('returns validation failure when policies disallow update', async () => {
    const target = makeUser('target');
    const repo: any = {
      findById: jest.fn().mockResolvedValue(target)
    };
    const publisher: any = { publish: jest.fn() };

    jest.spyOn((UserPolicies as any).UserPolicies, 'canUpdateProfile').mockReturnValue({ allowed: false, reason: 'Not allowed' });

    const sut = new UpdateUserUseCase(repo, publisher);

    const result = await sut.execute({ userId: 'target', updates: { firstName: 'X' }, updatedBy: 'target' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Not allowed');
  });

  it('updates successfully and publishes event when changes exist', async () => {
    const target = makeUser('target');
    const repo: any = {
      findById: jest.fn().mockResolvedValue(target),
      getUserPreferences: jest.fn().mockResolvedValue({ language: 'sw', timezone: 'EAT' }),
      updateUserPreferences: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockImplementation(async (u: any) => u)
    };
    const publisher: any = { publish: jest.fn().mockResolvedValue(undefined) };

    jest.spyOn((UserPolicies as any).UserPolicies, 'canUpdateProfile').mockReturnValue({ allowed: true });

    const sut = new UpdateUserUseCase(repo, publisher);

    const result = await sut.execute({ userId: 'target', updates: { firstName: 'Alice', language: 'en' } as any, updatedBy: 'target' });

    expect(result.success).toBe(true);
    expect(result.changes).toContain('firstName');
    expect(repo.updateUserPreferences).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalled();
  });
});
