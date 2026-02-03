import { VerifyPhoneUseCase } from '../verify-phone.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('VerifyPhoneUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new VerifyPhoneUseCase(repo);
    const out = await sut.execute({ userId: 'x', phoneNumber: '+255712345678', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('rejects invalid OTP format', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const sut = new VerifyPhoneUseCase(repo);
    const out = await sut.execute({ userId: 'u1', phoneNumber: '+255712345678', otp: '12', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid OTP');
  });

  it('rejects invalid phone number', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const sut = new VerifyPhoneUseCase(repo);
    const out = await sut.execute({ userId: 'u1', phoneNumber: 'invalid', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid phone number');
  });

  it('verifies phone with valid OTP', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), updatePhoneVerification: jest.fn() };
    const sut = new VerifyPhoneUseCase(repo);
    const out = await sut.execute({ userId: 'u1', phoneNumber: '+255712345678', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(true);
    expect(out.phoneVerified).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const sut = new VerifyPhoneUseCase(repo);
    const out = await sut.execute({ userId: 'u1', phoneNumber: '+255712345678', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
  });
});
