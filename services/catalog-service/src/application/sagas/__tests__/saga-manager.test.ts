import { SagaManager } from '../saga-manager';

class MockSaga {}

describe('SagaManager', () => {
  const mockSagaLogRepository = {
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    saveStep: jest.fn().mockResolvedValue(undefined),
    updateStep: jest.fn().mockResolvedValue(undefined),
    getSteps: jest.fn().mockResolvedValue([]),
    findStuck: jest.fn().mockResolvedValue([])
  };

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishAll: jest.fn().mockResolvedValue(undefined)
  };

  const mockIdGenerator = {
    generate: jest.fn().mockReturnValue('test-id-123'),
    validate: jest.fn().mockReturnValue(true)
  };

  const mockDateTimeService = {
    now: jest.fn().mockReturnValue(new Date('2024-01-01T10:00:00Z')),
    timestamp: jest.fn().mockReturnValue(new Date('2024-01-01T10:00:00Z').getTime()),
    add: jest.fn().mockImplementation((date: Date) => date),
    isPast: jest.fn().mockReturnValue(false),
    format: jest.fn().mockReturnValue('2024-01-01T10:00:00Z')
  };

  const mockOrchestrator = {
    start: jest.fn().mockResolvedValue('mock-saga-123'),
    completeStep: jest.fn().mockResolvedValue(undefined),
    failStep: jest.fn().mockResolvedValue(undefined)
  };

  let sagaManager: SagaManager;

  beforeEach(() => {
    jest.clearAllMocks();
    sagaManager = new SagaManager(
      mockSagaLogRepository as never,
      mockEventPublisher as never,
      mockIdGenerator as never,
      mockDateTimeService as never
    );
    sagaManager.registerOrchestrator('MockSaga', mockOrchestrator as never);
  });

  it('delegates startSaga to a registered orchestrator and stores correlation metadata', async () => {
    const sagaId = await sagaManager.startSaga(() => new MockSaga(), { testData: 'value' }, 'correlation-123');

    expect(sagaId).toBe('mock-saga-123');
    expect(mockOrchestrator.start).toHaveBeenCalledWith({ testData: 'value' }, 'correlation-123');

    const correlations = (sagaManager as unknown as {
      correlations: Map<string, { correlationId: string; sagaId: string; expiresAt: Date }>;
    }).correlations;

    expect(correlations.get('correlation-123')).toEqual(
      expect.objectContaining({
        correlationId: 'correlation-123',
        sagaId: 'mock-saga-123'
      })
    );
  });

  it('throws when starting a saga without a registered orchestrator', async () => {
    const orphanManager = new SagaManager(
      mockSagaLogRepository as never,
      mockEventPublisher as never,
      mockIdGenerator as never,
      mockDateTimeService as never
    );

    await expect(orphanManager.startSaga(() => new MockSaga(), { testData: 'value' })).rejects.toThrow(
      'Orchestrator for saga type MockSaga not registered'
    );
  });

  it('delegates completion to the registered orchestrator when an entry exists', async () => {
    mockSagaLogRepository.getById.mockResolvedValueOnce({
      sagaType: 'MockSaga',
      currentStep: 'step-1'
    });

    await sagaManager.completeSaga('mock-saga-123');

    expect(mockOrchestrator.completeStep).toHaveBeenCalledWith('mock-saga-123', 'step-1');
  });

  it('delegates failure to the registered orchestrator when an entry exists', async () => {
    mockSagaLogRepository.getById.mockResolvedValueOnce({
      sagaType: 'MockSaga',
      currentStep: 'step-1'
    });

    await sagaManager.failSaga('mock-saga-123', 'Test failure');

    expect(mockOrchestrator.failStep).toHaveBeenCalledWith('mock-saga-123', 'step-1', 'Test failure');
  });

  it('ignores events that do not carry a saga id', async () => {
    await expect(sagaManager.handleEvent({ eventType: 'TestEvent' })).resolves.toBeUndefined();
    expect(mockSagaLogRepository.getById).not.toHaveBeenCalled();
  });

  it('removes expired correlations during cleanup', async () => {
    const correlations = (sagaManager as unknown as {
      correlations: Map<string, { correlationId: string; sagaId: string; expiresAt: Date }>;
    }).correlations;

    correlations.set('expired', {
      correlationId: 'expired',
      sagaId: 'mock-saga-123',
      expiresAt: new Date('2023-12-31T23:59:59Z')
    });
    correlations.set('active', {
      correlationId: 'active',
      sagaId: 'mock-saga-456',
      expiresAt: new Date('2099-01-01T00:00:00Z')
    });

    await sagaManager.cleanupExpiredCorrelations();

    expect(correlations.has('expired')).toBe(false);
    expect(correlations.has('active')).toBe(true);
  });

  it('returns the current default query values', () => {
    expect(sagaManager.getSagaInstance('missing')).toBeUndefined();
    expect(sagaManager.getActiveSagas()).toEqual([]);
    expect(sagaManager.getSagasByCorrelation('missing')).toEqual([]);
    expect(sagaManager.getSagaStatistics()).toEqual({
      total: 0,
      running: 0,
      completed: 0,
      failed: 0,
      totalSagas: 0,
      activeSagas: 0,
      completedSagas: 0,
      failedSagas: 0,
      compensatedSagas: 0
    });
  });
});
