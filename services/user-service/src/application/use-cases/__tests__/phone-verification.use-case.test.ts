import { PhoneVerificationUseCase } from '../phone-verification.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('PhoneVerificationUseCase', () => {
  describe('sendOTP', () => {
    it('returns not found when user missing', async () => {
      const repo: any = { findById: jest.fn().mockResolvedValue(null) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.sendOTP({ userId: 'x', phoneNumber: '+255712345678', method: 'sms' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('User not found');
    });

    it('rejects invalid phone number', async () => {
      const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
      const repo: any = { findById: jest.fn().mockResolvedValue(user) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.sendOTP({ userId: 'u1', phoneNumber: 'invalid', method: 'sms' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('Invalid phone number');
    });

    it('sends OTP via SMS', async () => {
      const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
      const repo: any = { findById: jest.fn().mockResolvedValue(user) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.sendOTP({ userId: 'u1', phoneNumber: '+255712345678', method: 'sms' });
      expect(out.success).toBe(true);
      expect(out.otpSent).toBe(true);
      expect(out.expiresIn).toBe(600);
    });

    it('sends OTP via call', async () => {
      const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
      const repo: any = { findById: jest.fn().mockResolvedValue(user) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.sendOTP({ userId: 'u1', phoneNumber: '+255712345678', method: 'call' });
      expect(out.success).toBe(true);
      expect(out.otpSent).toBe(true);
    });

    it('handles errors gracefully', async () => {
      const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.sendOTP({ userId: 'u1', phoneNumber: '+255712345678', method: 'sms' });
      expect(out.success).toBe(false);
    });
  });

  describe('verifyOTP', () => {
    it('returns not found when user missing', async () => {
      const repo: any = { findById: jest.fn().mockResolvedValue(null) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.verifyOTP({ userId: 'x', phoneNumber: '+255712345678', otp: '123456' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('User not found');
    });

    it('rejects invalid OTP format', async () => {
      const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
      const repo: any = { findById: jest.fn().mockResolvedValue(user) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.verifyOTP({ userId: 'u1', phoneNumber: '+255712345678', otp: '12' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('Invalid OTP format');
    });

    it('rejects expired OTP', async () => {
      const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
      const repo: any = { findById: jest.fn().mockResolvedValue(user) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.verifyOTP({ userId: 'u1', phoneNumber: '+255712345678', otp: '123456' });
      expect(out.success).toBe(false);
      expect(out.message).toContain('OTP expired');
    });

    it('handles errors gracefully', async () => {
      const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
      const sut = new PhoneVerificationUseCase(repo);
      const out = await sut.verifyOTP({ userId: 'u1', phoneNumber: '+255712345678', otp: '123456' });
      expect(out.success).toBe(false);
    });
  });
});
