import { SetupTwoFactorUseCase } from '../setup-two-factor.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('SetupTwoFactorUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const sut = new SetupTwoFactorUseCase(repo);
    const out = await sut.execute({ userId: 'x', method: 'totp' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('generates TOTP secret for totp method', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), setupTwoFactor: jest.fn() };
    const sut = new SetupTwoFactorUseCase(repo);
    const out = await sut.execute({ userId: 'u1', method: 'totp' });
    expect(out.success).toBe(true);
    expect(out.secret).toBeDefined();
    expect(out.secret?.length).toBe(32);
  });

  it('generates backup codes', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), setupTwoFactor: jest.fn() };
    const sut = new SetupTwoFactorUseCase(repo);
    const out = await sut.execute({ userId: 'u1', method: 'sms' });
    expect(out.success).toBe(true);
    expect(Array.isArray(out.backupCodes)).toBe(true);
    expect(out.backupCodes?.length).toBe(10);
  });

  it('includes deviceId when provided', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn().mockResolvedValue(user), setupTwoFactor: jest.fn() };
    const sut = new SetupTwoFactorUseCase(repo);
    const out = await sut.execute({ userId: 'u1', method: 'totp', deviceId: 'device-123' });
    expect(out.success).toBe(true);
    expect(repo.setupTwoFactor).toHaveBeenCalledWith('u1', expect.objectContaining({ deviceId: 'device-123' }));
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const sut = new SetupTwoFactorUseCase(repo);
    const out = await sut.execute({ userId: 'u1', method: 'totp' });
    expect(out.success).toBe(false);
  });
});
