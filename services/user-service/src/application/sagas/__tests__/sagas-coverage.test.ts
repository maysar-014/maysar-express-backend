import { executeAccountDeletionSaga, AccountDeletionEvent } from '../account-deletion.saga';
import { executeAccountSuspensionSaga, AccountSuspensionEvent } from '../account-suspension.saga';
import { executePasswordResetSaga, PasswordResetSaga } from '../password-reset.saga';
import { notificationClient, auditClient, sessionClient } from '../service-clients';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../service-clients');
jest.mock('../../../infrastructure/services/logger.service');

describe('Account Deletion Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionClient.invalidateUserSessions as jest.Mock).mockResolvedValue(undefined);
    (auditClient.recordEvent as jest.Mock).mockResolvedValue(undefined);
    (notificationClient.sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  test('executes all steps successfully', async () => {
    const event: AccountDeletionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'User requested',
      deletedBy: 'admin-1',
      timestamp: new Date()
    };

    await executeAccountDeletionSaga(event);

    expect(sessionClient.invalidateUserSessions).toHaveBeenCalledWith('user-1', 'Account deletion');
    expect(auditClient.recordEvent).toHaveBeenCalled();
    expect(notificationClient.sendEmail).toHaveBeenCalled();
  });

  test('handles session termination failure', async () => {
    const event: AccountDeletionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'User requested',
      deletedBy: 'admin-1',
      timestamp: new Date()
    };

    (sessionClient.invalidateUserSessions as jest.Mock).mockRejectedValueOnce(new Error('Session error'));

    await expect(executeAccountDeletionSaga(event)).rejects.toThrow('Session error');
  });

  test('handles audit recording failure', async () => {
    const event: AccountDeletionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'User requested',
      deletedBy: 'admin-1',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    await expect(executeAccountDeletionSaga(event)).rejects.toThrow('Audit error');
  });

  test('handles notification failure', async () => {
    const event: AccountDeletionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'User requested',
      deletedBy: 'admin-1',
      timestamp: new Date()
    };

    (notificationClient.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Notification error'));

    await expect(executeAccountDeletionSaga(event)).rejects.toThrow('Notification error');
  });

  test('executes without reason', async () => {
    const event: AccountDeletionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      deletedBy: 'admin-1',
      timestamp: new Date()
    };

    await executeAccountDeletionSaga(event);

    expect(sessionClient.invalidateUserSessions).toHaveBeenCalled();
  });
});

describe('Account Suspension Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionClient.invalidateUserSessions as jest.Mock).mockResolvedValue(undefined);
    (auditClient.recordEvent as jest.Mock).mockResolvedValue(undefined);
    (notificationClient.sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  test('executes all steps successfully', async () => {
    const event: AccountSuspensionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'Violation',
      suspendedBy: 'admin-1',
      duration: 3600000,
      timestamp: new Date()
    };

    await executeAccountSuspensionSaga(event);

    expect(sessionClient.invalidateUserSessions).toHaveBeenCalledWith('user-1', 'Account suspended: Violation');
    expect(auditClient.recordEvent).toHaveBeenCalled();
    expect(notificationClient.sendEmail).toHaveBeenCalled();
  });

  test('handles permanent suspension (no duration)', async () => {
    const event: AccountSuspensionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'Permanent ban',
      suspendedBy: 'admin-1',
      timestamp: new Date()
    };

    await executeAccountSuspensionSaga(event);

    expect(sessionClient.invalidateUserSessions).toHaveBeenCalled();
  });

  test('handles session termination failure', async () => {
    const event: AccountSuspensionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'Violation',
      suspendedBy: 'admin-1',
      timestamp: new Date()
    };

    (sessionClient.invalidateUserSessions as jest.Mock).mockRejectedValueOnce(new Error('Session error'));

    await expect(executeAccountSuspensionSaga(event)).rejects.toThrow('Session error');
  });

  test('handles audit recording failure', async () => {
    const event: AccountSuspensionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'Violation',
      suspendedBy: 'admin-1',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    await expect(executeAccountSuspensionSaga(event)).rejects.toThrow('Audit error');
  });

  test('handles notification failure', async () => {
    const event: AccountSuspensionEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      reason: 'Violation',
      suspendedBy: 'admin-1',
      timestamp: new Date()
    };

    (notificationClient.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Notification error'));

    await expect(executeAccountSuspensionSaga(event)).rejects.toThrow('Notification error');
  });
});

describe('Password Reset Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('executes all steps successfully', async () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      timestamp: new Date()
    };

    await executePasswordResetSaga(event as any);

    expect(logger.info).toHaveBeenCalledWith('Invalidating active sessions', { userId: 'user-1' });
    expect(logger.info).toHaveBeenCalledWith('Sending password change notification', { userId: 'user-1' });
  });

  test('compensates on step failure', async () => {
    const saga = new PasswordResetSaga();
    let executeCount = 0;

    saga.addStep({
      name: 'Step1',
      execute: async () => {
        executeCount++;
      },
      compensate: async () => {
        logger.info('Compensating Step1');
      }
    });

    saga.addStep({
      name: 'Step2',
      execute: async () => {
        throw new Error('Step2 failed');
      },
      compensate: async () => {
        logger.info('Compensating Step2');
      }
    });

    await expect(saga.execute()).rejects.toThrow('Step2 failed');
    expect(executeCount).toBe(1);
    expect(logger.info).toHaveBeenCalledWith('Compensating Step1');
  });

  test('executes multiple steps in order', async () => {
    const saga = new PasswordResetSaga();
    const executionOrder: string[] = [];

    saga.addStep({
      name: 'Step1',
      execute: async () => {
        executionOrder.push('Step1');
      },
      compensate: async () => {
        executionOrder.push('Step1-compensate');
      }
    });

    saga.addStep({
      name: 'Step2',
      execute: async () => {
        executionOrder.push('Step2');
      },
      compensate: async () => {
        executionOrder.push('Step2-compensate');
      }
    });

    saga.addStep({
      name: 'Step3',
      execute: async () => {
        throw new Error('Step3 failed');
      },
      compensate: async () => {
        executionOrder.push('Step3-compensate');
      }
    });

    await expect(saga.execute()).rejects.toThrow('Step3 failed');

    expect(executionOrder).toEqual(['Step1', 'Step2', 'Step2-compensate', 'Step1-compensate']);
  });

  test('logs step completion', async () => {
    const saga = new PasswordResetSaga();

    saga.addStep({
      name: 'TestStep',
      execute: async () => {
        // Success
      },
      compensate: async () => {
        // No-op
      }
    });

    await saga.execute();

    expect(logger.info).toHaveBeenCalledWith('Password reset saga step completed: TestStep');
  });

  test('handles empty steps', async () => {
    const saga = new PasswordResetSaga();

    await saga.execute();

    expect(logger.error).not.toHaveBeenCalled();
  });

  test('handles compensation errors gracefully', async () => {
    const saga = new PasswordResetSaga();

    saga.addStep({
      name: 'Step1',
      execute: async () => {
        throw new Error('Step1 failed');
      },
      compensate: async () => {
        throw new Error('Compensation failed');
      }
    });

    await expect(saga.execute()).rejects.toThrow('Step1 failed');
    expect(logger.error).toHaveBeenCalled();
  });
});
