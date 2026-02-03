import { ChangeRoleUseCase } from '../change-role.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('ChangeRoleUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new ChangeRoleUseCase(repo);
    const out = await sut.execute({ userId: 'x', newRole: 'seller', changedBy: 'admin' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('denies when changer is not admin', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const other = User.create({ id: 'other', email: Email.create('c@gmail.com'), phoneNumber: PhoneNumber.create('+255712345680'), firstName: 'C', lastName: 'D', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : other)) };
    const sut = new ChangeRoleUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newRole: 'seller', changedBy: 'other' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('administrator');
  });

  it('rejects invalid role', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)) };
    const sut = new ChangeRoleUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newRole: 'invalid', changedBy: 'admin' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid role');
  });

  it('rejects same role', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)), updateRole: jest.fn() };
    const sut = new ChangeRoleUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newRole: 'buyer', changedBy: 'admin' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('already has this role');
  });

  it('changes role when admin', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const admin = User.create({ id: 'admin', email: Email.create('b@gmail.com'), phoneNumber: PhoneNumber.create('+255712345679'), firstName: 'B', lastName: 'C', role: UserRole.SYSTEM });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)), updateRole: jest.fn() };
    const sut = new ChangeRoleUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newRole: 'seller', changedBy: 'admin' });
    expect(out.success).toBe(true);
    expect(out.oldRole).toBe('buyer');
    expect(out.newRole).toBe('seller');
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const sut = new ChangeRoleUseCase(repo);
    const out = await sut.execute({ userId: 'u1', newRole: 'seller', changedBy: 'admin' });
    expect(out.success).toBe(false);
  });
});
