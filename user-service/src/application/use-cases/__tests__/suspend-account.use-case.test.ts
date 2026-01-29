import { SuspendAccountUseCase } from '../suspend-account.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('SuspendAccountUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new SuspendAccountUseCase(repo);
    const out = await sut.execute({ userId: 'x', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('denies when suspender is not admin', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)) };
    const sut = new SuspendAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('administrator');
  });

  it('suspends account when admin', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)), updateStatus: jest.fn() };
    const sut = new SuspendAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(true);
    expect(repo.updateStatus).toHaveBeenCalledWith('u1', 'suspended');
  });

  it('calculates suspension end date when duration provided', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)), updateStatus: jest.fn() };
    const sut = new SuspendAccountUseCase(repo);
    const duration = 86400000;
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test', duration });
    expect(out.success).toBe(true);
    expect(out.suspensionEndDate).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const sut = new SuspendAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(false);
  });
});
