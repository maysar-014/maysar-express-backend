import { SuspendAccountUseCase } from '../suspend-account.use-case';
import { UserRole } from '../../../domain/types/user.types';
import { UserFactory } from '../../../domain/entities/__tests__/user.factory';

jest.mock('../../../application/sagas/saga-event-handler');

describe('SuspendAccountUseCase', () => {
  const makePublisher = () => ({ publish: jest.fn(), publishMany: jest.fn() });

  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new SuspendAccountUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'x', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('denies when suspender is not admin', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const admin = UserFactory.create({ id: 'admin', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new SuspendAccountUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('administrator');
  });

  it('suspends account when admin', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const admin = UserFactory.createAdmin({ id: 'admin' });
    const repo: any = {
      findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new SuspendAccountUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(true);
    expect(repo.updateStatus).toHaveBeenCalledWith('u1', 'suspended');
  });

  it('calculates suspension end date when duration provided', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const admin = UserFactory.createAdmin({ id: 'admin' });
    const repo: any = {
      findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)),
      updateStatus: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new SuspendAccountUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const duration = 86400000;
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test', duration });
    expect(out.success).toBe(true);
    expect(out.suspensionEndDate).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new SuspendAccountUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', suspendedBy: 'admin', reason: 'test' });
    expect(out.success).toBe(false);
  });
});
