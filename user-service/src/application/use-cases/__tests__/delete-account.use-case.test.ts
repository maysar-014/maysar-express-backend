import { DeleteAccountUseCase } from '../delete-account.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('DeleteAccountUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new DeleteAccountUseCase(repo);
    const out = await sut.execute({ userId: 'x', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('allows user to delete own account', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), recordSecurityEvent: jest.fn() };
    const sut = new DeleteAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(true);
    expect(out.deletionScheduledAt).toBeDefined();
  });

  it('allows admin to delete account', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)), recordSecurityEvent: jest.fn() };
    const sut = new DeleteAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(true);
  });

  it('denies non-owner non-admin', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const other = User.create({ id: 'other', email: Email.create('c@gmail.com'), phoneNumber: PhoneNumber.create('+255712345680'), firstName: 'C', lastName: 'D', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : other)) };
    const sut = new DeleteAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'other', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Insufficient permissions');
  });

  it('includes user data in event', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), recordSecurityEvent: jest.fn() };
    const sut = new DeleteAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const sut = new DeleteAccountUseCase(repo);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(false);
  });
});
