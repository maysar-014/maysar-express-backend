import { SetupTwoFactorUseCase } from '../setup-two-factor.use-case';
import { UserRole } from '../../../domain/types/user.types';
import { UserFactory } from '../../../domain/entities/__tests__/user.factory';

jest.mock('../../../application/sagas/saga-event-handler');

describe('SetupTwoFactorUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new SetupTwoFactorUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'x', method: 'totp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('generates TOTP secret for totp method', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const repo: any = {
      findById: jest.fn().mockImplementation(async (id) => id === 'u1' ? user : null),
      setupTwoFactor: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new SetupTwoFactorUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', method: 'totp' });
    expect(out.success).toBe(true);
    expect(out.secret).toBeDefined();
    expect(out.secret?.length).toBe(32);
  });

  it('generates backup codes', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      setupTwoFactor: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new SetupTwoFactorUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', method: 'sms' });
    expect(out.success).toBe(true);
    expect(Array.isArray(out.backupCodes)).toBe(true);
    expect(out.backupCodes?.length).toBe(10);
  });

  it('includes deviceId when provided', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      setupTwoFactor: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new SetupTwoFactorUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', method: 'totp', deviceId: 'device-123' });
    expect(out.success).toBe(true);
    expect(repo.setupTwoFactor).toHaveBeenCalledWith('u1', expect.objectContaining({ deviceId: 'device-123' }));
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new SetupTwoFactorUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', method: 'totp' });
    expect(out.success).toBe(false);
  });
});
