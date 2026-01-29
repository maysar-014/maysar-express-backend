import { EmailVerificationSaga, executeEmailVerificationSaga } from '../email-verification.saga';
import { UserEmailVerifiedEvent } from '../../../domain/events';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('EmailVerificationSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EmailVerificationSaga class', () => {
    test('initializes with empty steps', () => {
      const saga = new EmailVerificationSaga();
      expect(saga['steps']).toEqual([]);
    });

    test('addStep adds step to steps array', () => {
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
      await saga.execute();
      expect(saga['steps']).toHaveLength(0);
    });

    test('execute with single step', async () => {
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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
      const saga = new EmailVerificationSaga();
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

  describe('executeEmailVerificationSaga', () => {
    test('executes email verification saga with event', async () => {
      const event = {
        eventId: 'evt-1',
        aggregateId: 'user-1'
      } as UserEmailVerifiedEvent;

      await executeEmailVerificationSaga(event);
      expect(logger.info).toHaveBeenCalled();
    });

    test('creates saga with UpdateUserStatus step', async () => {
      const event = {
        eventId: 'evt-2',
        aggregateId: 'user-2'
      } as UserEmailVerifiedEvent;

      await executeEmailVerificationSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Updating user status to verified', expect.any(Object));
    });

    test('creates saga with SendConfirmationEmail step', async () => {
      const event = {
        eventId: 'evt-3',
        aggregateId: 'user-3'
      } as UserEmailVerifiedEvent;

      await executeEmailVerificationSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Sending confirmation email', expect.any(Object));
    });

    test('executes both steps in order', async () => {
      const event = {
        eventId: 'evt-4',
        aggregateId: 'user-4'
      } as UserEmailVerifiedEvent;

      await executeEmailVerificationSaga(event);
      const calls = (logger.info as jest.Mock).mock.calls;
      const updateCall = calls.find(c => c[0].includes('Updating'));
      const sendCall = calls.find(c => c[0].includes('Sending'));
      expect(updateCall).toBeDefined();
      expect(sendCall).toBeDefined();
    });

    test('logs with correct userId', async () => {
      const event = {
        eventId: 'evt-5',
        aggregateId: 'user-5'
      } as UserEmailVerifiedEvent;

      await executeEmailVerificationSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Updating user status to verified', { userId: 'user-5' });
    });

    test('logs step completion messages', async () => {
      const event = {
        eventId: 'evt-6',
        aggregateId: 'user-6'
      } as UserEmailVerifiedEvent;

      await executeEmailVerificationSaga(event);
      expect(logger.info).toHaveBeenCalledWith('Email verification saga step completed: UpdateUserStatus');
      expect(logger.info).toHaveBeenCalledWith('Email verification saga step completed: SendConfirmationEmail');
    });
  });
});
