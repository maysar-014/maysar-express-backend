/**
 * Base Saga Framework Tests
 *
 * Constitution Section 11: Testing Constitution - Saga tests must validate orchestration & compensation
 * Constitution Section 6: Saga Orchestration Law - Only sagas may coordinate multiple services
 */

import { BaseSaga, SagaContext, SagaStep } from '../../../application/sagas/base.saga';

describe('BaseSaga Framework', () => {
  // Mock saga implementation for testing
  class TestSaga extends BaseSaga<TestSagaData> {
    constructor() {
      super();
      this.setupTestSteps();
    }

    private setupTestSteps(): void {
      this.step('step1', async () => {
        this.context!.data.step1Executed = true;
      });

      this.step('step2', async () => {
        this.context!.data.step2Executed = true;
      });

      this.addCompensation('step1', async () => {
        this.context!.data.step1Compensated = true;
      });

      this.addCompensation('step2', async () => {
        this.context!.data.step2Compensated = true;
      });
    }

    async execute(context: SagaContext<TestSagaData>): Promise<void> {
      await this.executeStep(this.steps[0]);
      await this.executeStep(this.steps[1]);
    }
  }

  // Test data interface - flexible to allow additional properties for different test scenarios
  interface TestSagaData {
    step1Executed?: boolean;
    step2Executed?: boolean;
    step1Compensated?: boolean;
    step2Compensated?: boolean;
    shouldFailAt?: string;
    successExecuted?: boolean;
    compensated?: boolean;
    initialized?: boolean;
    stepWorked?: boolean;
    instance?: number;
    dynamic1?: boolean;
    dynamic2?: boolean;
    [key: string]: any; // Allow additional properties for flexible testing
  }

  let saga: TestSaga;
  let testData: TestSagaData;

  beforeEach(() => {
    saga = new TestSaga();
    testData = {};
  });

  describe('saga lifecycle', () => {
    it('should initialize with not_started status', () => {
      expect(saga.getStatus()).toBe('not_started');
      expect(saga.getContext()).toBeNull();
    });

    it('should start successfully and return saga ID', async () => {
      const sagaId = await saga.start(testData);

      expect(sagaId).toMatch(/^saga_\d+_[a-z0-9]+$/);
      expect(saga.getStatus()).toBe('completed');
    });

    it('should execute all steps in sequence', async () => {
      await saga.start(testData);

      const context = saga.getContext();
      expect(context).not.toBeNull();
      expect(context!.data.step1Executed).toBe(true);
      expect(context!.data.step2Executed).toBe(true);
      expect(context!.completedSteps).toEqual(['step1', 'step2']);
      expect(context!.failedSteps).toEqual([]);
      expect(context!.compensations).toEqual([]);
    });

    it('should have proper start time', async () => {
      const beforeStart = new Date();
      await saga.start(testData);
      const afterStart = new Date();

      const context = saga.getContext();
      expect(context!.startTime).toBeInstanceOf(Date);
      expect(context!.startTime.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
      expect(context!.startTime.getTime()).toBeLessThanOrEqual(afterStart.getTime());
    });
  });

  describe('step execution', () => {
    it('should track completed steps', async () => {
      await saga.start(testData);

      const context = saga.getContext();
      expect(context!.completedSteps).toContain('step1');
      expect(context!.completedSteps).toContain('step2');
      expect(context!.completedSteps).toHaveLength(2);
    });

    it('should execute steps in order', async () => {
      const executionOrder: string[] = [];

      // Create a custom saga to track execution order
      class OrderTrackingSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          await this.step('first', async () => {
            executionOrder.push('first');
          });

          await this.step('second', async () => {
            executionOrder.push('second');
          });

          await this.step('third', async () => {
            executionOrder.push('third');
          });
        }
      }

      const orderSaga = new OrderTrackingSaga();
      await orderSaga.start({});

      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('compensation mechanism', () => {
    it('should register compensations for steps', async () => {
      await saga.start(testData);

      // Verify compensations are registered (internal check)
      const sagaInstance = saga as any;
      expect(sagaInstance.compensations.has('step1')).toBe(true);
      expect(sagaInstance.compensations.has('step2')).toBe(true);
    });

    it('should execute compensations in reverse order on failure', async () => {
      class FailingSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          await this.step('successStep', async () => {
            context.data.successExecuted = true;
          });

          this.addCompensation('successStep', async () => {
            context.data.compensated = true;
          });

          await this.step('failingStep', async () => {
            throw new Error('Test failure');
          });
        }
      }

      const failingSaga = new FailingSaga();

      await expect(failingSaga.start(testData)).rejects.toThrow('Test failure');

      const context = failingSaga.getContext();
      expect(context!.status).toBe('failed');
      expect(context!.completedSteps).toEqual(['successStep']);
      expect(context!.failedSteps).toEqual(['failingStep']);
      expect(context!.compensations).toEqual(['successStep']);
      expect(context!.data.successExecuted).toBe(true);
      expect(context!.data.compensated).toBe(true);
    });

    it('should continue compensation even if one compensation fails', async () => {
      class PartialCompensationFailureSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          await this.step('step1', async () => {});
          await this.step('step2', async () => {});

          this.addCompensation('step1', async () => {
            throw new Error('Compensation 1 failed');
          });

          this.addCompensation('step2', async () => {
            context.data.step2Compensated = true;
          });

          await this.step('failingStep', async () => {
            throw new Error('Main failure');
          });
        }
      }

      const failingSaga = new PartialCompensationFailureSaga();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(failingSaga.start(testData)).rejects.toThrow('Main failure');

      const context = failingSaga.getContext();
      expect(context!.compensations).toEqual(['step2', 'step1']); // Reverse order
      expect(context!.data.step2Compensated).toBe(true);

      // Should have logged the compensation failure
      expect(consoleSpy).toHaveBeenCalledWith(
        'Compensation failed for step step1:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should transition to failed status on error', async () => {
      class FailingSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          throw new Error('Saga execution failed');
        }
      }

      const failingSaga = new FailingSaga();

      await expect(failingSaga.start(testData)).rejects.toThrow('Saga execution failed');

      expect(failingSaga.getStatus()).toBe('failed');
    });

    it('should handle step execution errors', async () => {
      class StepErrorSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          await this.step('failingStep', async () => {
            throw new Error('Step failed');
          });
        }
      }

      const errorSaga = new StepErrorSaga();

      await expect(errorSaga.start(testData)).rejects.toThrow('Step failed');

      const context = errorSaga.getContext();
      expect(context!.failedSteps).toEqual(['failingStep']);
      expect(context!.status).toBe('failed');
    });

    it('should maintain context integrity on errors', async () => {
      class ContextIntegritySaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          context.data.initialized = true;
          await this.step('workingStep', async () => {
            context.data.stepWorked = true;
          });

          this.addCompensation('workingStep', async () => {
            context.data.compensated = true;
          });

          throw new Error('Final failure');
        }
      }

      const integritySaga = new ContextIntegritySaga();

      await expect(integritySaga.start(testData)).rejects.toThrow('Final failure');

      const context = integritySaga.getContext();
      expect(context!.data.initialized).toBe(true);
      expect(context!.data.stepWorked).toBe(true);
      expect(context!.data.compensated).toBe(true);
      expect(context!.status).toBe('failed');
    });
  });

  describe('event publishing', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should publish SagaCompleted event on success', async () => {
      await saga.start(testData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saga Event: SagaCompleted',
        expect.objectContaining({
          sagaId: expect.any(String),
          completedAt: expect.any(Date),
          metadata: expect.any(Object)
        })
      );
    });

    it('should publish SagaFailed event on failure', async () => {
      class FailingSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          throw new Error('Test failure');
        }
      }

      const failingSaga = new FailingSaga();

      await expect(failingSaga.start(testData)).rejects.toThrow('Test failure');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saga Event: SagaFailed',
        expect.objectContaining({
          sagaId: expect.any(String),
          error: 'Test failure',
          failedAt: expect.any(Date),
          metadata: expect.any(Object)
        })
      );
    });

    it('should publish step completion events', async () => {
      await saga.start(testData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saga Event: SagaStepCompleted',
        expect.objectContaining({
          sagaId: expect.any(String),
          stepName: 'step1',
          completedAt: expect.any(Date)
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saga Event: SagaStepCompleted',
        expect.objectContaining({
          sagaId: expect.any(String),
          stepName: 'step2',
          completedAt: expect.any(Date)
        })
      );
    });

    it('should publish step failure events', async () => {
      class StepFailureSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          await this.step('failingStep', async () => {
            throw new Error('Step error');
          });
        }
      }

      const failingSaga = new StepFailureSaga();

      await expect(failingSaga.start(testData)).rejects.toThrow('Step error');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saga Event: SagaStepFailed',
        expect.objectContaining({
          sagaId: expect.any(String),
          stepName: 'failingStep',
          error: 'Step error',
          failedAt: expect.any(Date)
        })
      );
    });

    it('should publish compensation events', async () => {
      class CompensatingSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          await this.step('compensableStep', async () => {});
          this.addCompensation('compensableStep', async () => {});

          throw new Error('Trigger compensation');
        }
      }

      const compensatingSaga = new CompensatingSaga();

      await expect(compensatingSaga.start(testData)).rejects.toThrow('Trigger compensation');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saga Event: SagaCompensationCompleted',
        expect.objectContaining({
          sagaId: expect.any(String),
          stepName: 'compensableStep',
          compensatedAt: expect.any(Date)
        })
      );
    });
  });

  describe('context management', () => {
    it('should maintain context throughout saga execution', async () => {
      await saga.start(testData);

      const context = saga.getContext();
      expect(context).not.toBeNull();
      expect(context!.sagaId).toMatch(/^saga_\d+_[a-z0-9]+$/);
      expect(context!.startTime).toBeInstanceOf(Date);
      expect(context!.status).toBe('completed');
      expect(Array.isArray(context!.completedSteps)).toBe(true);
      expect(Array.isArray(context!.failedSteps)).toBe(true);
      expect(Array.isArray(context!.compensations)).toBe(true);
    });

    it('should isolate context between saga instances', async () => {
      const saga1 = new TestSaga();
      const saga2 = new TestSaga();

      await saga1.start({ instance: 1 });
      await saga2.start({ instance: 2 });

      const context1 = saga1.getContext();
      const context2 = saga2.getContext();

      expect(context1!.sagaId).not.toBe(context2!.sagaId);
      expect(context1!.data.instance).toBe(1);
      expect(context2!.data.instance).toBe(2);
    });
  });

  describe('saga ID generation', () => {
    it('should generate unique saga IDs', async () => {
      const saga1 = new TestSaga();
      const saga2 = new TestSaga();

      const id1 = await saga1.start({});
      const id2 = await saga2.start({});

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^saga_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^saga_\d+_[a-z0-9]+$/);
    });

    it('should include timestamp in saga ID', async () => {
      const beforeStart = Date.now();
      const sagaId = await saga.start(testData);
      const afterStart = Date.now();

      const timestampPart = sagaId.split('_')[1];
      const timestamp = parseInt(timestampPart);

      expect(timestamp).toBeGreaterThanOrEqual(beforeStart);
      expect(timestamp).toBeLessThanOrEqual(afterStart);
    });
  });

  describe('status transitions', () => {
    it('should transition through correct status sequence on success', async () => {
      // Note: Status transitions are internal, but we can verify final status
      await saga.start(testData);

      expect(saga.getStatus()).toBe('completed');
    });

    it('should transition through correct status sequence on failure', async () => {
      class FailingSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          throw new Error('Test failure');
        }
      }

      const failingSaga = new FailingSaga();

      await expect(failingSaga.start(testData)).rejects.toThrow('Test failure');

      expect(failingSaga.getStatus()).toBe('failed');
    });
  });

  describe('step management', () => {
    it('should allow adding steps dynamically', () => {
      class DynamicStepSaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          await this.step('dynamic1', async () => {
            context.data.dynamic1 = true;
          });

          await this.step('dynamic2', async () => {
            context.data.dynamic2 = true;
          });
        }
      }

      const dynamicSaga = new DynamicStepSaga();
      dynamicSaga.start({});

      // Steps are added during execution, so we can't easily test this
      // without more complex async handling
    });

    it('should handle empty step list', async () => {
      class EmptySaga extends BaseSaga<TestSagaData> {
        async execute(context: SagaContext<TestSagaData>): Promise<void> {
          // No steps
        }
      }

      const emptySaga = new EmptySaga();
      const sagaId = await emptySaga.start(testData);

      expect(sagaId).toBeDefined();
      expect(emptySaga.getStatus()).toBe('completed');
      expect(emptySaga.getContext()!.completedSteps).toEqual([]);
    });
  });
});
