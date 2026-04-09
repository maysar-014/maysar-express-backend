import { ChangePasswordUseCase } from '../change-password.use-case';
import { UserRole } from '../../../domain/types/user.types';
import { UserFactory } from '../../../domain/entities/__tests__/user.factory';

jest.mock('../../../application/sagas/saga-event-handler');

describe('ChangePasswordUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new ChangePasswordUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'x', newPassword: 'NewPass123!', changedBy: 'u1' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('allows user to change own password', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      updatePassword: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangePasswordUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newPassword: 'NewPass123!', changedBy: 'u1' });
    expect(out.success).toBe(true);
  });

  it('allows admin to reset password', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const admin = UserFactory.createAdmin({ id: 'admin' });
    const repo: any = {
      findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)),
      updatePassword: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangePasswordUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newPassword: 'NewPass123!', changedBy: 'admin' });
    expect(out.success).toBe(true);
  });

  it('denies non-owner non-admin', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const other = UserFactory.create({ id: 'other' });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : other)) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangePasswordUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newPassword: 'NewPass123!', changedBy: 'other' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Insufficient permissions');
  });

  it('rejects short password', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = { findById: jest.fn().mockResolvedValue(user) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangePasswordUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newPassword: 'short', changedBy: 'u1' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('at least 8 characters');
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new ChangePasswordUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newPassword: 'NewPass123!', changedBy: 'u1' });
    expect(out.success).toBe(false);
  });
});
