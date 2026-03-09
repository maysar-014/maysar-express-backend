import { DistributedSagaOrchestrator, SagaStep } from './saga.orchestrator';
import { ISagaDeadLetterRepository } from './saga-dead-letter.repository';
import { ISagaLogRepository, SagaLogEntry, SagaStatus, SagaStepStatus } from './saga.log';

const publishMock = jest.fn().mockResolvedValue(undefined);
const createMetadataMock = jest.fn(() => ({ correlationId: 'corr', idempotencyKey: 'idem' }));
const withRetryMock = jest.fn(async (operation: () => Promise<unknown>) => {
  try {
    const data = await operation();
    return { success: true, data, attempts: 1, totalDuration: 0 };
  } catch (error) {
    return { success: false, error, attempts: 1, totalDuration: 0 };
  }
});
const loggerInfoMock = jest.fn();
const loggerErrorMock = jest.fn();
let uuidCounter = 0;

jest.mock('uuid', () => ({
  v4: jest.fn(() => `uuid-${++uuidCounter}`)
}));

jest.mock('../events/eventBus', () => ({
  eventBus: {
    publish: (...args: unknown[]) => publishMock(...args)
  }
}));

jest.mock('../events/metadata', () => ({
  createEventMetadata: (...args: any[]) => createMetadataMock.apply(null, args)
}));

jest.mock('../utils/retry.util', () => ({
  withRetry: (...args: any[]) => withRetryMock.apply(null, args),
  RetryPresets: {
    STANDARD: { maxAttempts: 3 },
    SLOW: { maxAttempts: 5 }
  }
}));

jest.mock('../metrics/metrics.factory', () => ({
  metricsRegistry: {}
}));

jest.mock('prom-client', () => {
  class MockMetric {
    labels() {
      return {
        observe: jest.fn(),
        inc: jest.fn(),
        dec: jest.fn()
      };
    }
  }

  return {
    Counter: MockMetric,
    Histogram: MockMetric,
    Gauge: MockMetric
  };
});

jest.mock('../logger/logger', () => ({
  createLogger: jest.fn(() => ({
    info: (...args: unknown[]) => loggerInfoMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args)
  }))
}));

interface TestPayload {
  orderId: string;
}

const createSagaLogRepository = (): jest.Mocked<ISagaLogRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  getById: jest.fn().mockResolvedValue(null),
  saveStep: jest.fn().mockResolvedValue(undefined),
  updateStep: jest.fn().mockResolvedValue(undefined),
  getSteps: jest.fn().mockResolvedValue([]),
  findStuck: jest.fn().mockResolvedValue([])
});

const createStep = (
  name: string,
  executeImpl: (payload: TestPayload, sagaId: string) => Promise<void> = async () => undefined,
  compensateImpl: (payload: TestPayload, sagaId: string) => Promise<void> = async () => undefined,
  validateCompensation?: (payload: TestPayload, sagaId: string) => Promise<boolean>
): SagaStep<TestPayload> => ({
  name,
  execute: jest.fn(executeImpl),
  compensate: jest.fn(compensateImpl),
  validateCompensation
});

const createSaga = (
  steps: SagaStep<TestPayload>[],
  sagaLogRepository: ISagaLogRepository,
  outbox?: { saveEvent: jest.Mock },
  deadLetterRepository?: ISagaDeadLetterRepository
) => {
  class TestSaga extends DistributedSagaOrchestrator<TestPayload> {
    protected sagaType = 'TestSaga';

    protected defineSteps(): SagaStep<TestPayload>[] {
      return steps;
    }
  }

  return new TestSaga(
    sagaLogRepository,
    'test-service',
    outbox,
    undefined,
    undefined,
    deadLetterRepository
  );
};

describe('DistributedSagaOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
    withRetryMock.mockImplementation(async (operation: () => Promise<unknown>) => {
      try {
        const data = await operation();
        return { success: true, data, attempts: 1, totalDuration: 0 };
      } catch (error) {
        return { success: false, error, attempts: 1, totalDuration: 0 };
      }
    });
  });

  it('starts saga, logs STARTED state, and publishes SagaStarted', async () => {
    const repo = createSagaLogRepository();
    const saga = createSaga([createStep('reserve-stock')], repo);
    const executeSpy = jest
      .spyOn(saga as unknown as { executeNextStep: (id: string, payload: TestPayload, idx: number) => Promise<void> }, 'executeNextStep')
      .mockResolvedValue(undefined);

    const sagaId = await saga.start({ orderId: 'ord-1' }, 'corr-1');

    expect(sagaId).toBe('uuid-1');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sagaId: 'uuid-1',
        sagaType: 'TestSaga',
        status: SagaStatus.STARTED,
        currentStep: 'START'
      })
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SagaStarted',
        correlationId: 'corr-1'
      })
    );
    expect(executeSpy).toHaveBeenCalledWith('uuid-1', { orderId: 'ord-1' }, 0);
  });

  it('executes step successfully and completes saga when all steps are done', async () => {
    const repo = createSagaLogRepository();
    const step = createStep('charge-payment');
    const saga = createSaga([step], repo);
    const completeSpy = jest
      .spyOn(saga as unknown as { completeSaga: (id: string) => Promise<void> }, 'completeSaga')
      .mockResolvedValue(undefined);

    await (saga as unknown as { executeNextStep: (id: string, payload: TestPayload, idx: number) => Promise<void> })
      .executeNextStep('saga-1', { orderId: 'ord-2' }, 0);

    expect(repo.saveStep).toHaveBeenCalledWith(
      expect.objectContaining({ stepName: 'charge-payment', status: SagaStepStatus.STARTED })
    );
    expect(repo.updateStep).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: SagaStepStatus.COMPLETED })
    );
    expect(completeSpy).toHaveBeenCalledWith('saga-1');
  });

  it('marks step failed and calls failSaga when execute fails', async () => {
    const repo = createSagaLogRepository();
    const step = createStep('notify-user', async () => {
      throw new Error('step failed');
    });
    const saga = createSaga([step], repo);
    const failSpy = jest
      .spyOn(
        saga as unknown as {
          failSaga: (
            sagaId: string,
            failedStepName: string,
            error: string,
            payload: TestPayload,
            failedStepIndex: number
          ) => Promise<void>;
        },
        'failSaga'
      )
      .mockResolvedValue(undefined);

    await (saga as unknown as { executeNextStep: (id: string, payload: TestPayload, idx: number) => Promise<void> })
      .executeNextStep('saga-2', { orderId: 'ord-3' }, 0);

    expect(repo.updateStep).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: SagaStepStatus.FAILED,
        error: 'step failed'
      })
    );
    expect(failSpy).toHaveBeenCalledWith('saga-2', 'notify-user', 'step failed', { orderId: 'ord-3' }, 0);
  });

  it('compensates steps in reverse and marks saga compensated', async () => {
    const repo = createSagaLogRepository();
    const step1 = createStep('step1');
    const step2 = createStep('step2');
    const saga = createSaga([step1, step2], repo);
    const markSpy = jest
      .spyOn(saga as unknown as { markAsCompensated: (id: string) => Promise<void> }, 'markAsCompensated')
      .mockResolvedValue(undefined);

    await (saga as unknown as { compensate: (id: string, payload: TestPayload, idx: number) => Promise<void> })
      .compensate('saga-3', { orderId: 'ord-4' }, 1);

    expect(step2.compensate).toHaveBeenCalledWith({ orderId: 'ord-4' }, 'saga-3');
    expect(step1.compensate).toHaveBeenCalledWith({ orderId: 'ord-4' }, 'saga-3');
    expect(markSpy).toHaveBeenCalledWith('saga-3');
  });

  it('routes to dead letter when compensation retries are exhausted', async () => {
    const repo = createSagaLogRepository();
    const step = createStep('step1');
    const saga = createSaga([step], repo);
    const routeSpy = jest
      .spyOn(
        saga as unknown as {
          routeToDeadLetter: (id: string, payload: TestPayload, lastError: string, reason: string) => Promise<void>;
        },
        'routeToDeadLetter'
      )
      .mockResolvedValue(undefined);

    withRetryMock.mockResolvedValueOnce({
      success: false,
      error: new Error('retry exhausted'),
      attempts: 5,
      totalDuration: 20
    });

    await (saga as unknown as { compensate: (id: string, payload: TestPayload, idx: number) => Promise<void> })
      .compensate('saga-4', { orderId: 'ord-5' }, 0);

    expect(routeSpy).toHaveBeenCalledWith(
      'saga-4',
      { orderId: 'ord-5' },
      'retry exhausted',
      'MAX_COMPENSATION_RETRIES_EXCEEDED'
    );
  });

  it('routes to dead letter when compensation validation fails', async () => {
    const repo = createSagaLogRepository();
    const step = createStep(
      'step1',
      async () => undefined,
      async () => undefined,
      async () => false
    );
    const saga = createSaga([step], repo);
    const routeSpy = jest
      .spyOn(
        saga as unknown as {
          routeToDeadLetter: (id: string, payload: TestPayload, lastError: string, reason: string) => Promise<void>;
        },
        'routeToDeadLetter'
      )
      .mockResolvedValue(undefined);

    await (saga as unknown as { compensate: (id: string, payload: TestPayload, idx: number) => Promise<void> })
      .compensate('saga-5', { orderId: 'ord-6' }, 0);

    expect(routeSpy).toHaveBeenCalledWith(
      'saga-5',
      { orderId: 'ord-6' },
      'Compensation validation failed for step step1',
      'COMPENSATION_VALIDATION_FAILED'
    );
  });

  it('updates saga and saves dead letter on routeToDeadLetter', async () => {
    const repo = createSagaLogRepository();
    const deadLetterRepository: ISagaDeadLetterRepository = {
      save: jest.fn().mockResolvedValue(undefined)
    };
    const saga = createSaga([createStep('step1')], repo, undefined, deadLetterRepository);

    await (
      saga as unknown as {
        routeToDeadLetter: (id: string, payload: TestPayload, lastError: string, reason: string) => Promise<void>;
      }
    ).routeToDeadLetter('saga-6', { orderId: 'ord-7' }, 'fatal', 'COMP_FAIL');

    expect(repo.update).toHaveBeenCalledWith(
      'saga-6',
      expect.objectContaining({ status: SagaStatus.FAILED })
    );
    expect(deadLetterRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sagaId: 'saga-6',
        sagaType: 'TestSaga',
        lastError: 'fatal',
        reason: 'COMP_FAIL'
      })
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SagaFailed'
      })
    );
  });

  it('resumes STARTED saga from current step index', async () => {
    const repo = createSagaLogRepository();
    repo.getById.mockResolvedValue({
      sagaId: 'saga-7',
      sagaType: 'TestSaga',
      status: SagaStatus.STARTED,
      currentStep: 'step2',
      payload: { orderId: 'ord-8' },
      context: {},
      createdAt: new Date(),
      updatedAt: new Date()
    } as SagaLogEntry);

    const saga = createSaga([createStep('step1'), createStep('step2')], repo);
    const executeSpy = jest
      .spyOn(
        saga as unknown as { executeNextStep: (id: string, payload: TestPayload, idx: number) => Promise<void> },
        'executeNextStep'
      )
      .mockResolvedValue(undefined);

    await saga.resume('saga-7');

    expect(executeSpy).toHaveBeenCalledWith('saga-7', { orderId: 'ord-8' }, 1);
  });

  it('resumes COMPENSATING saga and marks compensated when no active steps remain', async () => {
    const repo = createSagaLogRepository();
    repo.getById.mockResolvedValue({
      sagaId: 'saga-8',
      sagaType: 'TestSaga',
      status: SagaStatus.COMPENSATING,
      currentStep: 'step1',
      payload: { orderId: 'ord-9' },
      context: {},
      createdAt: new Date(),
      updatedAt: new Date()
    } as SagaLogEntry);
    repo.getSteps.mockResolvedValue([
      {
        id: 'st-1',
        sagaId: 'saga-8',
        stepName: 'step1',
        status: SagaStepStatus.COMPLETED,
        startedAt: new Date()
      }
    ]);

    const saga = createSaga([createStep('step1')], repo);
    const markSpy = jest
      .spyOn(saga as unknown as { markAsCompensated: (id: string) => Promise<void> }, 'markAsCompensated')
      .mockResolvedValue(undefined);

    await saga.resume('saga-8');

    expect(markSpy).toHaveBeenCalledWith('saga-8');
  });

  it('publishes commands through outbox when configured', async () => {
    const repo = createSagaLogRepository();
    const outbox = { saveEvent: jest.fn().mockResolvedValue(undefined) };
    const saga = createSaga([createStep('step1')], repo, outbox);

    await (
      saga as unknown as {
        publishCommand: (
          commandType: string,
          payload: unknown,
          correlationId: string,
          sagaId?: string
        ) => Promise<void>;
      }
    ).publishCommand('ReserveInventoryCommand', { orderId: 'ord-10' }, 'corr-10', 'saga-10');

    expect(createMetadataMock).toHaveBeenCalledWith(
      'test-service',
      expect.objectContaining({
        correlationId: 'corr-10',
        idempotencyKey: 'ReserveInventoryCommand-corr-10'
      })
    );
    expect(outbox.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ReserveInventoryCommand',
        data: { orderId: 'ord-10' },
        metadata: expect.objectContaining({ sagaId: 'saga-10' })
      })
    );
  });
});
