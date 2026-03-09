import { BaseSaga, SagaContext, SagaStep } from './base.saga';

class SuccessSaga extends BaseSaga<{ count: number }> {
  async execute(_context: SagaContext<{ count: number }>): Promise<void> {
    await this.step('increment', async ctx => {
      ctx.data.count += 1;
    });
    this.addCompensation('increment', async ctx => {
      ctx.data.count -= 1;
    });
    await this.step('double', async ctx => {
      ctx.data.count *= 2;
    });
  }
}

class FailureSaga extends BaseSaga<{ count: number }> {
  constructor(private failCompensation = false) {
    super();
  }

  async execute(_context: SagaContext<{ count: number }>): Promise<void> {
    await this.step('increment', async ctx => {
      ctx.data.count += 1;
    });
    this.addCompensation('increment', async ctx => {
      if (this.failCompensation) {
        throw new Error('compensation broken');
      }
      ctx.data.count -= 1;
    });
    await this.step('explode', async () => {
      throw new Error('boom');
    });
  }
}

class ManualSaga extends BaseSaga<{ count: number }> {
  async execute(_context: SagaContext<{ count: number }>): Promise<void> {}

  async registerPreStep(): Promise<void> {
    await this.step('pre', async () => undefined);
  }

  getRegisteredStepNames(): string[] {
    return (this as any).steps.map((s: SagaStep<{ count: number }>) => s.name);
  }

  async callExecuteStep(step: SagaStep<{ count: number }>): Promise<void> {
    await (this as any).executeStep(step);
  }
}

describe('BaseSaga (logistics)', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs successful saga and marks context/status as completed', async () => {
    const saga = new SuccessSaga();
    const sagaId = await saga.start({ count: 1 });

    expect(sagaId).toMatch(/^saga_/);
    expect(saga.getStatus()).toBe('completed');
    expect(saga.getContext()).toEqual(
      expect.objectContaining({
        status: 'completed',
        completedSteps: ['increment', 'double'],
        failedSteps: [],
        compensations: [],
        data: { count: 4 }
      })
    );
    expect(logSpy).toHaveBeenCalledWith('Saga Event: SagaCompleted', expect.any(Object));
  });

  it('executes compensations on failure and marks saga failed', async () => {
    const saga = new FailureSaga(false);
    await expect(saga.start({ count: 1 })).rejects.toThrow('boom');

    expect(saga.getStatus()).toBe('failed');
    expect(saga.getContext()).toEqual(
      expect.objectContaining({
        status: 'failed',
        completedSteps: ['increment'],
        failedSteps: ['explode'],
        compensations: ['increment'],
        data: { count: 1 }
      })
    );
    expect(logSpy).toHaveBeenCalledWith('Saga Event: SagaCompensationCompleted', expect.any(Object));
    expect(logSpy).toHaveBeenCalledWith('Saga Event: SagaFailed', expect.any(Object));
  });

  it('logs compensation errors but preserves original failure', async () => {
    const saga = new FailureSaga(true);
    await expect(saga.start({ count: 10 })).rejects.toThrow('boom');

    expect(errorSpy).toHaveBeenCalledWith('Compensation failed for step increment:', expect.any(Error));
    expect(saga.getStatus()).toBe('failed');
  });

  it('allows pre-registering steps before context and guards executeStep without context', async () => {
    const saga = new ManualSaga();
    await saga.registerPreStep();
    expect(saga.getRegisteredStepNames()).toEqual(['pre']);

    await expect(
      saga.callExecuteStep({
        name: 'manual',
        execute: async () => undefined
      })
    ).rejects.toThrow('Saga context not initialized');
  });
});
