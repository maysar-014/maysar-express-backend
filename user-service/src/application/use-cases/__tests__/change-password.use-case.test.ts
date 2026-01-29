import { ChangePasswordUseCase } from '../change-password.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('ChangePasswordUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new ChangePasswordUseCase(repo);
    const out = await sut.execute({ userId: 'x', newPassword: 'newpass123', changedBy: 'u1' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('allows user to change own password', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), updatePassword: jest.fn() };
    const sut = new ChangePasswordUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newPassword: 'newpass123', changedBy: 'u1' });
    expect(out.success).toBe(true);
  });

  it('allows admin to reset password', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)), updatePassword: jest.fn() };
    const sut = new ChangePasswordUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newPassword: 'newpass123', changedBy: 'admin' });
    expect(out.success).toBe(true);
  });

  it('denies non-owner non-admin', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const other = User.create({ id: 'other', email: Email.create('c@gmail.com'), phoneNumber: PhoneNumber.create('+255712345680'), firstName: 'C', lastName: 'D', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : other)) };
    const sut = new ChangePasswordUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newPassword: 'newpass123', changedBy: 'other' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Insufficient permissions');
  });

  it('rejects short password', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const sut = new ChangePasswordUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newPassword: 'short', changedBy: 'u1' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('at least 8 characters');
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const sut = new ChangePasswordUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newPassword: 'newpass123', changedBy: 'u1' });
    expect(out.success).toBe(false);
  });
});
