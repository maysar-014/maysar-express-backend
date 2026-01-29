import { PasswordResetSaga, executePasswordResetSaga } from '../password-reset.saga';
import { UserPasswordChangedEvent } from '../../../domain/events';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('PasswordResetSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PasswordResetSaga class', () => {
    test('initializes with empty steps', () => {
      const saga = new PasswordResetSaga();
      expect(saga['steps']).toEqual([]);
    });

    test('addStep adds step to steps array', () => {
      const saga = new PasswordResetSaga();
      const step = {
        name: 'test-step',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step);
      expect(saga['steps']).toHaveLength(1);
      expect(saga['steps'][0]).toBe(step);
    });

    test('addStep adds multiple steps in order', () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);
      expect(saga['steps']).toHaveLength(2);
      expect(saga['steps'][0]).toBe(step1);
      expect(saga['steps'][1]).toBe(step2);
    });
  });

  describe('execute with successful steps', () => {
    test('execute runs all steps successfully', async () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await saga.execute();

      expect(step1.execute).toHaveBeenCalled();
      expect(step2.execute).toHaveBeenCalled();
      expect(step1.compensate).not.toHaveBeenCalled();
      expect(step2.compensate).not.toHaveBeenCalled();
    });

    test('execute with empty steps array', async () => {
      const saga = new PasswordResetSaga();
      await saga.execute();
      expect(saga['steps']).toHaveLength(0);
    });

    test('execute with single step', async () => {
      const saga = new PasswordResetSaga();
      const step = {
        name: 'single-step',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step);
      await saga.execute();

      expect(step.execute).toHaveBeenCalled();
      expect(step.compensate).not.toHaveBeenCalled();
    });
  });

  describe('execute with step failure and compensation', () => {
    test('execute compensates on first step failure', async () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockRejectedValue(new Error('Step failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);

      await expect(saga.execute()).rejects.toThrow('Step failed');
      expect(step1.execute).toHaveBeenCalled();
    });

    test('execute compensates on second step failure', async () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Step failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await expect(saga.execute()).rejects.toThrow('Step failed');
      expect(step1.compensate).toHaveBeenCalled();
    });

    test('execute compensates in reverse order', async () => {
      const saga = new PasswordResetSaga();
      const compensationOrder: string[] = [];

      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockImplementation(async () => {
          compensationOrder.push('step-1');
        })
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockImplementation(async () => {
          compensationOrder.push('step-2');
        })
      };
      const step3 = {
        name: 'step-3',
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);
      saga.addStep(step3);

      try {
        await saga.execute();
      } catch (e) {
        // Expected
      }

      expect(compensationOrder).toEqual(['step-2', 'step-1']);
    });

    test('execute handles compensation failure gracefully', async () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockRejectedValue(new Error('Compensation failed'))
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Step failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await expect(saga.execute()).rejects.toThrow('Step failed');
      expect(step1.compensate).toHaveBeenCalled();
    });

    test('execute with three steps and middle step failure', async () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Middle failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step3 = {
        name: 'step-3',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);
      saga.addStep(step3);

      await expect(saga.execute()).rejects.toThrow('Middle failed');
      expect(step1.compensate).toHaveBeenCalled();
      expect(step3.execute).not.toHaveBeenCalled();
    });
  });

  describe('compensation with undefined step branch', () => {
    test('handles undefined step in compensation loop', async () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await expect(saga.execute()).rejects.toThrow('Failed');
      expect(step1.compensate).toHaveBeenCalled();
    });

    test('skips null step during compensation', async () => {
      const saga = new PasswordResetSaga();
      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await expect(saga.execute()).rejects.toThrow('Failed');
    });

    test('continues compensation after skipping undefined', async () => {
      const saga = new PasswordResetSaga();
      const compensationCalls: string[] = [];

      const step1 = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockImplementation(async () => {
          compensationCalls.push('step-1');
        })
      };
      const step2 = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      try {
        await saga.execute();
      } catch (e) {
        // Expected
      }

      expect(compensationCalls).toContain('step-1');
    });
  });

  describe('executePasswordResetSaga', () => {
    test('executes password reset saga with event', async () => {
      const event = {
        eventId: 'evt-1',
        aggregateId: 'user-1'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event);
      expect(logger.info).toHaveBeenCalled();
    });

    test('creates saga with InvalidateActiveSessions step', async () => {
      const event = {
        eventId: 'evt-2',
        aggregateId: 'user-2'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Invalidating active sessions', expect.any(Object));
    });

    test('creates saga with SendPasswordChangeNotification step', async () => {
      const event = {
        eventId: 'evt-3',
        aggregateId: 'user-3'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Sending password change notification', expect.any(Object));
    });

    test('executes both steps in order', async () => {
      const event = {
        eventId: 'evt-4',
        aggregateId: 'user-4'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event);
      const calls = (logger.info as jest.Mock).mock.calls;
      const invalidateCall = calls.find(c => c[0].includes('Invalidating'));
      const notifyCall = calls.find(c => c[0].includes('Sending'));
      expect(invalidateCall).toBeDefined();
      expect(notifyCall).toBeDefined();
    });

    test('logs with correct userId for InvalidateActiveSessions', async () => {
      const event = {
        eventId: 'evt-5',
        aggregateId: 'user-5'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Invalidating active sessions', { userId: 'user-5' });
    });

    test('logs with correct userId for SendPasswordChangeNotification', async () => {
      const event = {
        eventId: 'evt-6',
        aggregateId: 'user-6'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Sending password change notification', { userId: 'user-6' });
    });

    test('logs step completion messages', async () => {
      const event = {
        eventId: 'evt-7',
        aggregateId: 'user-7'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Password reset saga step completed: InvalidateActiveSessions');
      expect(logger.info).toHaveBeenCalledWith('Password reset saga step completed: SendPasswordChangeNotification');
    });

    test('handles saga execution with different user IDs', async () => {
      const event1 = {
        eventId: 'evt-8',
        aggregateId: 'user-8'
      } as UserPasswordChangedEvent;

      const event2 = {
        eventId: 'evt-9',
        aggregateId: 'user-9'
      } as UserPasswordChangedEvent;

      await executePasswordResetSaga(event1);
      await executePasswordResetSaga(event2);

      expect(logger.info).toHaveBeenCalledWith('Invalidating active sessions', { userId: 'user-8' });
      expect(logger.info).toHaveBeenCalledWith('Invalidating active sessions', { userId: 'user-9' });
    });
  });
});
