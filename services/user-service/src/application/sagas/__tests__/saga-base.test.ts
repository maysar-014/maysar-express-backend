import { BaseSaga, SagaError, SagaStep } from '../saga-base';

describe('BaseSaga', () => {
  interface TestContext {
    userId: string;
    data: string[];
  }

  let saga: BaseSaga<TestContext>;
  let context: TestContext;

  beforeEach(() => {
    context = { userId: 'user-1', data: [] };
    saga = new BaseSaga('idempotency-key-1', context);
  });

  describe('constructor', () => {
    test('initializes with idempotencyKey and context', () => {
      expect(saga['idempotencyKey']).toBe('idempotency-key-1');
      expect(saga['context']).toEqual(context);
      expect(saga['steps']).toEqual([]);
      expect(saga['compensationRecords']).toEqual([]);
      expect(saga['processedSteps'].size).toBe(0);
    });
  });

  describe('addStep', () => {
    test('adds step to steps array', () => {
      const step: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step);
      expect(saga['steps']).toHaveLength(1);
      expect(saga['steps'][0]).toBe(step);
    });

    test('adds multiple steps in order', () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2: SagaStep<TestContext> = {
        name: 'step-2',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);
      expect(saga['steps']).toHaveLength(2);
      expect(saga['steps'][0]?.name).toBe('step-1');
      expect(saga['steps'][1]?.name).toBe('step-2');
    });
  });

  describe('execute', () => {
    test('executes all steps in order', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2: SagaStep<TestContext> = {
        name: 'step-2',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await saga.execute();

      expect(step1.execute).toHaveBeenCalledWith(context);
      expect(step2.execute).toHaveBeenCalledWith(context);
      expect(saga['processedSteps'].has('step-1')).toBe(true);
      expect(saga['processedSteps'].has('step-2')).toBe(true);
    });

    test('skips already processed steps', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga['processedSteps'].add('step-1');

      await saga.execute();

      expect(step1.execute).not.toHaveBeenCalled();
    });

    test('compensates on step failure', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2: SagaStep<TestContext> = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Step 2 failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await expect(saga.execute()).rejects.toThrow('Step 2 failed');

      expect(step1.compensate).toHaveBeenCalledWith(context);
      expect(saga['compensationRecords']).toHaveLength(1);
      expect(saga['compensationRecords'][0]?.stepName).toBe('step-1');
      expect(saga['compensationRecords'][0]?.status).toBe('completed');
    });

    test('handles compensation failure', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockRejectedValue(new Error('Compensation failed'))
      };
      const step2: SagaStep<TestContext> = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Step 2 failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await expect(saga.execute()).rejects.toThrow('Step 2 failed');

      expect(saga['compensationRecords']).toHaveLength(1);
      expect(saga['compensationRecords'][0]?.status).toBe('failed');
      expect(saga['compensationRecords'][0]?.error).toBe('Compensation failed');
    });

    test('executes steps with custom timeout', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined),
        options: { timeoutMs: 5000 }
      };

      saga.addStep(step1);
      await saga.execute();

      expect(step1.execute).toHaveBeenCalled();
    });

    test('throws timeout error when step exceeds timeout', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn(() => new Promise(resolve => setTimeout(resolve, 100))),
        compensate: jest.fn().mockResolvedValue(undefined),
        options: { timeoutMs: 10 }
      };

      saga.addStep(step1);

      await expect(saga.execute()).rejects.toThrow('Step timeout');
    });

    test('uses default timeout when not specified', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      await saga.execute();

      expect(step1.execute).toHaveBeenCalled();
    });
  });

  describe('getCompensationRecords', () => {
    test('returns empty array initially', () => {
      expect(saga.getCompensationRecords()).toEqual([]);
    });

    test('returns compensation records after compensation', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2: SagaStep<TestContext> = {
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

      const records = saga.getCompensationRecords();
      expect(records).toHaveLength(1);
      expect(records[0]?.stepName).toBe('step-1');
      expect(records[0]?.status).toBe('completed');
      expect(records[0]?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('SagaError', () => {
    test('creates error with message and context', () => {
      const errorContext = { userId: 'user-1' };
      const error = new SagaError('Test error', errorContext);

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('SagaError');
      expect(error.context).toEqual(errorContext);
    });

    test('creates error with default empty context', () => {
      const error = new SagaError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.context).toEqual({});
    });

    test('captures stack trace', () => {
      const error = new SagaError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SagaError');
    });
  });

  describe('compensation order', () => {
    test('compensates steps in reverse order', async () => {
      const compensationOrder: string[] = [];

      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockImplementation(async () => {
          compensationOrder.push('step-1');
        })
      };
      const step2: SagaStep<TestContext> = {
        name: 'step-2',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockImplementation(async () => {
          compensationOrder.push('step-2');
        })
      };
      const step3: SagaStep<TestContext> = {
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
  });

  describe('executeWithTimeout', () => {
    test('clears timeout on successful execution', async () => {
      const step: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step);
      await saga.execute();

      expect(step.execute).toHaveBeenCalled();
    });

    test('clears timeout on error', async () => {
      const step: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockRejectedValue(new Error('Test error')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step);

      await expect(saga.execute()).rejects.toThrow('Test error');
      expect(step.execute).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('handles empty steps array', async () => {
      await saga.execute();
      expect(saga['processedSteps'].size).toBe(0);
    });

    test('handles non-Error exceptions in compensation', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockRejectedValue('String error')
      };
      const step2: SagaStep<TestContext> = {
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

      expect(saga['compensationRecords'][0]?.error).toBe('String error');
    });

    test('handles undefined step in compensation', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step-1',
        execute: jest.fn().mockResolvedValue(undefined),
        compensate: jest.fn().mockResolvedValue(undefined)
      };
      const step2: SagaStep<TestContext> = {
        name: 'step-2',
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
        compensate: jest.fn().mockResolvedValue(undefined)
      };

      saga.addStep(step1);
      saga.addStep(step2);

      await expect(saga.execute()).rejects.toThrow('Failed');
      expect(saga['compensationRecords']).toHaveLength(1);
    });
  });
});
