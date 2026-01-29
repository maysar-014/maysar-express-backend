import { VerifyEmailUseCase } from '../verify-email.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('VerifyEmailUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const publisher: any = { publish: jest.fn() };
    const sut = new VerifyEmailUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'x', verificationToken: 'token' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('returns success when already verified', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    Object.defineProperty(user, 'emailVerified', { value: true, writable: false, configurable: true });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const publisher: any = { publish: jest.fn() };
    const sut = new VerifyEmailUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'u1', verificationToken: 'token' });
    expect(out.success).toBe(true);
    expect(out.emailVerified).toBe(true);
  });

  it('verifies email with valid token', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), updateEmailVerification: jest.fn(), recordSecurityEvent: jest.fn() };
    const publisher: any = { publish: jest.fn() };
    const sut = new VerifyEmailUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'u1', verificationToken: 'valid-token' });
    expect(out.success).toBe(true);
    expect(out.emailVerified).toBe(true);
  });

  it('records verification attempt', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), updateEmailVerification: jest.fn(), recordSecurityEvent: jest.fn() };
    const publisher: any = { publish: jest.fn() };
    const sut = new VerifyEmailUseCase(repo, publisher);
    await sut.execute({ userId: 'u1', verificationToken: 'token' });
    expect(repo.recordSecurityEvent).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const publisher: any = { publish: jest.fn() };
    const sut = new VerifyEmailUseCase(repo, publisher);
    const out = await sut.execute({ userId: 'u1', verificationToken: 'token' });
    expect(out.success).toBe(false);
  });
});
