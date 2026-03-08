import { Saga, SagaContext, SagaStep } from './sagaFramework';

describe('Saga framework', () => {
  class RecordingStep extends SagaStep<{ value: number }> {
    constructor(
      private readonly name: string,
      private readonly calls: string[],
      private readonly shouldFail: boolean = false
    ) {
      super();
    }

    async execute(_context: SagaContext<{ value: number }>): Promise<void> {
      this.calls.push(`execute:${this.name}`);
      if (this.shouldFail) {
        throw new Error(`step ${this.name} failed`);
      }
    }

    async compensate(_context: SagaContext<{ value: number }>): Promise<void> {
      this.calls.push(`compensate:${this.name}`);
    }
  }

  class TestSaga extends Saga<{ value: number }> {
    constructor(private readonly calls: string[]) {
      super();
    }

    async execute(context: SagaContext<{ value: number }>): Promise<void> {
      this.calls.push(`saga:${context.data.value}`);
    }
  }

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1741348800000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes steps in order and then runs saga body', async () => {
    const calls: string[] = [];
    const saga = new TestSaga(calls);
    saga.addStep(new RecordingStep('A', calls));
    saga.addStep(new RecordingStep('B', calls));

    const sagaId = await saga.start({ value: 7 });

    expect(sagaId).toBe('saga-1741348800000-4fzzzxjyl');
    expect(calls).toEqual(['execute:A', 'execute:B', 'saga:7']);
  });

  it('compensates in reverse order when a step fails', async () => {
    const calls: string[] = [];
    const saga = new TestSaga(calls);
    saga.addStep(new RecordingStep('A', calls));
    saga.addStep(new RecordingStep('B', calls, true));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(saga.start({ value: 5 })).rejects.toThrow('step B failed');

    expect(calls).toEqual(['execute:A', 'execute:B', 'compensate:B', 'compensate:A']);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
