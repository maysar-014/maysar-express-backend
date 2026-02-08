import { DeleteAccountUseCase } from '../delete-account.use-case';
import { UserRole } from '../../../domain/types/user.types';
import { UserFactory } from '../../../domain/entities/__tests__/user.factory';

jest.mock('../../../application/sagas/saga-event-handler');

describe('DeleteAccountUseCase', () => {
  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new DeleteAccountUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'x', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('allows user to delete own account', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      recordSecurityEvent: jest.fn().mockResolvedValue({ id: 'evt-1' })
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new DeleteAccountUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(true);
    expect(out.deletionScheduledAt).toBeDefined();
  });

  it('allows admin to delete account', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const admin = UserFactory.createAdmin({ id: 'admin' });
    const repo: any = {
      findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)),
      recordSecurityEvent: jest.fn().mockResolvedValue({ id: 'evt-2' })
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new DeleteAccountUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(true);
  });

  it('denies non-owner non-admin', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const other = UserFactory.create({ id: 'other' });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : other)) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new DeleteAccountUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'other', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Insufficient permissions');
  });

  it('includes user data in event', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const repo: any = {
      findById: jest.fn().mockResolvedValue(user),
      recordSecurityEvent: jest.fn().mockResolvedValue({ id: 'evt-3' })
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new DeleteAccountUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new DeleteAccountUseCase(repo, mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', deletedBy: 'u1', reason: 'test' });
    expect(out.success).toBe(false);
  });
});
