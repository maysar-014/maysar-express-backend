import { SagaRecoveryWorker } from './saga-recovery.worker';
import { SagaLogEntry, SagaStatus } from './saga.log';

const makeSaga = (overrides: Partial<SagaLogEntry> = {}): SagaLogEntry => ({
  sagaId: 'saga-1',
  sagaType: 'OrderSaga',
  status: SagaStatus.STARTED,
  currentStep: 'reserve',
  payload: { orderId: 'o1' },
  context: {},
  createdAt: new Date('2026-03-09T00:00:00.000Z'),
  updatedAt: new Date('2026-03-09T00:00:00.000Z'),
  ...overrides
});

describe('SagaRecoveryWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts once, triggers immediate recovery, and polls on interval', async () => {
    const repo = { findStuck: jest.fn().mockResolvedValue([]) };
    const worker = new SagaRecoveryWorker(repo as any, new Map(), {
      pollIntervalMs: 1000
    });
    const recoverSpy = jest.spyOn(worker, 'recover').mockResolvedValue(undefined);

    worker.start();
    expect(recoverSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(recoverSpy).toHaveBeenCalledTimes(2);

    worker.stop();
  });

  it('warns when start is called while worker is already running', () => {
    const repo = { findStuck: jest.fn().mockResolvedValue([]) };
    const worker = new SagaRecoveryWorker(repo as any, new Map(), {
      pollIntervalMs: 1000
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    worker.start();
    worker.start();

    expect(warnSpy).toHaveBeenCalledWith('SagaRecoveryWorker is already running');
  });

  it('stops interval loop and logs stop', () => {
    const repo = { findStuck: jest.fn().mockResolvedValue([]) };
    const worker = new SagaRecoveryWorker(repo as any, new Map(), {
      pollIntervalMs: 1000
    });
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    worker.start();
    worker.stop();

    expect(clearSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('SagaRecoveryWorker stopped');
  });

  it('queries stuck sagas with STARTED and COMPENSATING statuses', async () => {
    const repo = { findStuck: jest.fn().mockResolvedValue([]) };
    const worker = new SagaRecoveryWorker(repo as any, new Map(), {
      stuckThresholdMs: 1234
    });

    await worker.recover();

    expect(repo.findStuck).toHaveBeenCalledWith(
      [SagaStatus.STARTED, SagaStatus.COMPENSATING],
      1234
    );
  });

  it('resumes saga when orchestrator exists and clears recovery attempts on success', async () => {
    const repo = {
      findStuck: jest.fn().mockResolvedValue([makeSaga()])
    };
    const orchestrator = { resume: jest.fn().mockResolvedValue(undefined) };
    const registry = new Map<string, any>([['OrderSaga', orchestrator]]);
    const worker = new SagaRecoveryWorker(repo as any, registry, {
      maxRecoveryAttempts: 2
    });
    (worker as any).recoveryAttempts.set('saga-1', 1);

    await worker.recover();

    expect(orchestrator.resume).toHaveBeenCalledWith('saga-1');
    expect((worker as any).recoveryAttempts.has('saga-1')).toBe(false);
  });

  it('increments recovery attempts when resume fails', async () => {
    const repo = {
      findStuck: jest.fn().mockResolvedValue([makeSaga()])
    };
    const orchestrator = { resume: jest.fn().mockRejectedValue(new Error('resume failed')) };
    const registry = new Map<string, any>([['OrderSaga', orchestrator]]);
    const worker = new SagaRecoveryWorker(repo as any, registry);

    await worker.recover();

    expect((worker as any).recoveryAttempts.get('saga-1')).toBe(1);
  });

  it('skips saga when max recovery attempts are exceeded', async () => {
    const repo = {
      findStuck: jest.fn().mockResolvedValue([makeSaga()])
    };
    const orchestrator = { resume: jest.fn() };
    const registry = new Map<string, any>([['OrderSaga', orchestrator]]);
    const worker = new SagaRecoveryWorker(repo as any, registry, {
      maxRecoveryAttempts: 1
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (worker as any).recoveryAttempts.set('saga-1', 1);

    await worker.recover();

    expect(orchestrator.resume).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'SagaRecoveryWorker: saga saga-1 exceeded max recovery attempts (1), skipping'
    );
  });

  it('skips saga when no orchestrator is registered for saga type', async () => {
    const repo = {
      findStuck: jest.fn().mockResolvedValue([makeSaga({ sagaType: 'UnknownSaga' })])
    };
    const worker = new SagaRecoveryWorker(repo as any, new Map());
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await worker.recover();

    expect(warnSpy).toHaveBeenCalledWith(
      'SagaRecoveryWorker: no orchestrator registered for saga type UnknownSaga, skipping saga-1'
    );
  });
});
