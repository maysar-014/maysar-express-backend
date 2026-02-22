import { VerifyPhoneUseCase } from '../verify-phone.use-case';
import { UserRole } from '../../../domain/types/user.types';
import { UserFactory } from '../../../domain/entities/__tests__/user.factory';

jest.mock('../../../application/sagas/saga-event-handler');

describe('VerifyPhoneUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new VerifyPhoneUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'x', phoneNumber: '+255712345678', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('rejects invalid OTP format', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new VerifyPhoneUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', phoneNumber: '+255712345678', otp: '12', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid OTP');
  });

  it('rejects invalid phone number', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new VerifyPhoneUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', phoneNumber: 'invalid', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid phone number');
  });

  it('verifies phone with valid OTP', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      updatePhoneVerification: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new VerifyPhoneUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', phoneNumber: '+255712345678', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(true);
    expect(out.phoneVerified).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new VerifyPhoneUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', phoneNumber: '+255712345678', otp: '123456', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
  });

  it('rejects expired OTP', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new VerifyPhoneUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', phoneNumber: '+255712345678', otp: '000000', verificationMethod: 'otp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('expired');
  });
});
