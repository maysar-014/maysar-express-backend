import { ChangeRoleUseCase } from '../change-role.use-case';
import { UserRole } from '../../../domain/types/user.types';
import { UserFactory } from '../../../domain/entities/__tests__/user.factory';

jest.mock('../../../application/sagas/saga-event-handler');

describe('ChangeRoleUseCase', () => {
  const makePublisher = () => ({ publish: jest.fn(), publishMany: jest.fn() });

  it('returns not found when user missing', async () => {
    const repo: any = { findById: jest.fn().mockResolvedValue(null) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new ChangeRoleUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'x', newRole: 'seller', changedBy: 'admin' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('User not found');
  });

  it('denies when changer is not admin', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const other = UserFactory.create({ id: 'other', role: UserRole.BUYER });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : other)) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangeRoleUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newRole: 'seller', changedBy: 'other' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('administrator');
  });

  it('allows role change when caller roles already include admin privileges', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const repo: any = {
      findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : null)),
      updateRole: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangeRoleUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);

    const out = await sut.execute({
      userId: 'u1',
      newRole: 'seller',
      changedBy: 'auth-admin-123',
      changedByRoles: ['admin', 'system']
    });

    expect(out.success).toBe(true);
    expect(repo.updateRole).toHaveBeenCalledWith('u1', 'seller');
  });

  it('rejects invalid role', async () => {
    const user = UserFactory.create({ id: 'u1' });
    const admin = UserFactory.createAdmin({ id: 'admin' });
    const repo: any = { findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)) };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangeRoleUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newRole: 'invalid', changedBy: 'admin' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('Invalid role');
  });

  it('rejects same role', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const admin = UserFactory.createAdmin({ id: 'admin' });
    const repo: any = {
      findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)),
      updateRole: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangeRoleUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newRole: 'buyer', changedBy: 'admin' });
    expect(out.success).toBe(false);
    expect(out.message).toContain('already has this role');
  });

  it('changes role when admin', async () => {
    const user = UserFactory.create({ id: 'u1', role: UserRole.BUYER });
    const admin = UserFactory.createAdmin({ id: 'admin' });
    const repo: any = {
      findById: jest.fn((id) => Promise.resolve(id === 'u1' ? user : admin)),
      updateRole: jest.fn().mockResolvedValue(undefined)
    };
    const mockEmailService: any = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const mockNotificationClient: any = { notify: jest.fn().mockResolvedValue(undefined) };
    const sut = new ChangeRoleUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newRole: 'seller', changedBy: 'admin' });
    expect(out.success).toBe(true);
    expect(out.oldRole).toBe('buyer');
    expect(out.newRole).toBe('seller');
  });

  it('handles errors gracefully', async () => {
    const repo: any = { findById: jest.fn().mockRejectedValue(new Error('DB error')) };
    const mockEmailService: any = { sendEmail: jest.fn() };
    const mockNotificationClient: any = { notify: jest.fn() };
    const sut = new ChangeRoleUseCase(repo, makePublisher(), mockEmailService, mockNotificationClient);
    const out = await sut.execute({ userId: 'u1', newRole: 'seller', changedBy: 'admin' });
    expect(out.success).toBe(false);
  });
});
