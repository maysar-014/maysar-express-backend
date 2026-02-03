import { UpdateUserUseCase } from '../update-user.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('UpdateUserUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const publisher: any = { publish: jest.fn() };
    const sut = new UpdateUserUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'x', updates: { firstName: 'New' }, updatedBy: 'admin' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('allows self-update', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue(user), getUserPreferences: jest.fn().mockResolvedValue({}) };
    const publisher: any = { publish: jest.fn() };
    const sut = new UpdateUserUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    expect(out.success).toBe(true);
  });

  it('tracks changes', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue(user), getUserPreferences: jest.fn().mockResolvedValue({}) };
    const publisher: any = { publish: jest.fn() };
    const sut = new UpdateUserUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    expect(out.changes).toBeDefined();
    expect(Array.isArray(out.changes)).toBe(true);
  });

  it('publishes event on changes', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue(user), getUserPreferences: jest.fn().mockResolvedValue({}) };
    const publisher: any = { publish: jest.fn() };
    const sut = new UpdateUserUseCase(repo, publisher);
    await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const publisher: any = { publish: jest.fn() };
    const sut = new UpdateUserUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    expect(out.success).toBe(false);
  });
});
