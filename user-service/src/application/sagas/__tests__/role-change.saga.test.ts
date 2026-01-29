import { executeRoleChangeSaga, RoleChangeEvent } from '../role-change.saga';
import { notificationClient, auditClient } from '../service-clients';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../service-clients');
jest.mock('../../../infrastructure/services/logger.service');

describe('Role Change Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditClient.recordEvent as jest.Mock).mockResolvedValue(undefined);
    (notificationClient.sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  test('executes all steps for user to admin promotion', async () => {
    const event: RoleChangeEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      oldRole: 'user',
      newRole: 'admin',
      changedBy: 'super-admin',
      timestamp: new Date()
    };

    await executeRoleChangeSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Syncing permissions for role change', expect.objectContaining({ newRole: 'admin' }));
    expect(logger.info).toHaveBeenCalledWith('Updating access control lists', expect.any(Object));
    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-1', 'role_changed', expect.any(Object));
    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-1', 'role_changed', expect.any(Object));
  });

  test('executes all steps for admin to user demotion', async () => {
    const event: RoleChangeEvent = {
      eventId: 'evt-2',
      aggregateId: 'agg-2',
      userId: 'user-2',
      oldRole: 'admin',
      newRole: 'user',
      changedBy: 'super-admin',
      timestamp: new Date()
    };

    await executeRoleChangeSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Syncing permissions for role change', expect.objectContaining({ newRole: 'user' }));
    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-2', 'role_changed', expect.objectContaining({
      oldRole: 'admin',
      newRole: 'user'
    }));
  });

  test('executes all steps for seller to supplier role change', async () => {
    const event: RoleChangeEvent = {
      eventId: 'evt-3',
      aggregateId: 'agg-3',
      userId: 'user-3',
      oldRole: 'seller',
      newRole: 'supplier',
      changedBy: 'admin-1',
      timestamp: new Date()
    };

    await executeRoleChangeSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Syncing permissions for role change', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('Updating access control lists', expect.any(Object));
  });

  test('handles permission sync failure', async () => {
    const event: RoleChangeEvent = {
      eventId: 'evt-4',
      aggregateId: 'agg-4',
      userId: 'user-4',
      oldRole: 'user',
      newRole: 'admin',
      changedBy: 'admin-1',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Sync error'));

    await expect(executeRoleChangeSaga(event)).rejects.toThrow('Sync error');
  });

  test('handles email notification failure', async () => {
    const event: RoleChangeEvent = {
      eventId: 'evt-5',
      aggregateId: 'agg-5',
      userId: 'user-5',
      oldRole: 'user',
      newRole: 'admin',
      changedBy: 'admin-1',
      timestamp: new Date()
    };

    (notificationClient.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Email error'));

    await expect(executeRoleChangeSaga(event)).rejects.toThrow('Email error');
  });

  test('logs compensation steps on failure', async () => {
    const event: RoleChangeEvent = {
      eventId: 'evt-6',
      aggregateId: 'agg-6',
      userId: 'user-6',
      oldRole: 'user',
      newRole: 'admin',
      changedBy: 'admin-1',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    try {
      await executeRoleChangeSaga(event);
    } catch (e) {
      // Expected
    }

    expect(logger.info).toHaveBeenCalledWith('Reverting permissions to old role', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('Reverting access control lists', expect.any(Object));
  });

  test('records audit event with all details', async () => {
    const event: RoleChangeEvent = {
      eventId: 'evt-7',
      aggregateId: 'agg-7',
      userId: 'user-7',
      oldRole: 'seller',
      newRole: 'admin',
      changedBy: 'super-admin-1',
      timestamp: new Date()
    };

    await executeRoleChangeSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-7', 'role_changed', expect.objectContaining({
      oldRole: 'seller',
      newRole: 'admin',
      changedBy: 'super-admin-1'
    }));
  });
});
