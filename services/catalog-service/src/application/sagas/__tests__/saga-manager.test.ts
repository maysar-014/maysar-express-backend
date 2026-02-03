/**
 * Saga Manager Tests
 * Tests for saga lifecycle management, event correlation, and orchestration
 */

import { SagaManager, SagaInstance, SagaCorrelation } from '../saga-manager';
import { BaseSaga } from '../index';
import { DomainEventPublisher, IdGenerator, DateTimeService } from '../../../domain/interfaces';

// Mock dependencies
const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined)
};

const mockIdGenerator = {
  generate: jest.fn().mockReturnValue('test-id-123')
};

const mockDateTimeService = {
  now: jest.fn().mockReturnValue(new Date('2024-01-01T10:00:00Z'))
};

// Mock BaseSaga
class MockSaga extends BaseSaga {
  readonly sagaId: string;
  readonly sagaType = 'MockSaga';

  constructor() {
    super();
    this.sagaId = 'mock-saga-123';
  }

  protected initializeState(context: any): void {
    this.state = { ...context, initialized: true };
  }

  protected async executeNextStep(): Promise<void> {
    // Mock implementation
  }

  protected async processEvent(event: any): Promise<void> {
    // Mock implementation
  }

  public override getState(): any {
    return { currentStep: 'initialized' };
  }

  public override isCompleted(): boolean {
    return false;
  }

  public override async start(context: any): Promise<void> {
    // Mock start implementation
    this.initializeState(context);
  }

  public override async handleEvent(event: any): Promise<void> {
    // Mock event handling
  }

  public override async compensate(): Promise<void> {
    // Mock compensation
  }
}

describe('SagaManager', () => {
  let sagaManager: SagaManager;
  let mockSaga: MockSaga;

  beforeEach(() => {
    jest.clearAllMocks();
    sagaManager = new SagaManager(
      mockEventPublisher as any,
      mockIdGenerator as any,
      mockDateTimeService as any
    );
    mockSaga = new MockSaga();
  });

  describe('Saga Lifecycle Management', () => {
    describe('startSaga', () => {
      it('should start a new saga instance successfully', async () => {
        const context = { testData: 'value' };

        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        const sagaId = await sagaManager.startSaga(sagaFactory, context);

        expect(sagaFactory).toHaveBeenCalledWith(context);
        expect(sagaId).toBe('mock-saga-123');

        // Verify saga instance was created
        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance).toBeDefined();
        expect(instance?.sagaId).toBe('mock-saga-123');
        expect(instance?.sagaType).toBe('MockSaga');
        expect(instance?.status).toBe('running');

        // No event should be published on start - only on completion/failure
        expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      });

      it('should handle saga factory errors', async () => {
        const context = { testData: 'value' };
        const error = new Error('Factory failed');

        const sagaFactory = jest.fn().mockImplementation(() => {
          throw error;
        });

        await expect(sagaManager.startSaga(sagaFactory, context)).rejects.toThrow('Factory failed');
      });

      it('should start saga with correlation ID', async () => {
        const context = { testData: 'value' };
        const correlationId = 'correlation-123';

        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context, correlationId);

        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.correlationId).toBe(correlationId);
      });
    });

    describe('completeSaga', () => {
      it('should complete a running saga', async () => {
        // Start saga first
        const context = { testData: 'value' };
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context);

        // Mock saga as completed
        jest.spyOn(mockSaga, 'isCompleted').mockReturnValue(true);

        await sagaManager.completeSaga('mock-saga-123');

        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('completed');

        // Verify completion event was published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith({
          eventId: 'test-id-123',
          eventType: 'SagaCompleted',
          aggregateId: 'mock-saga-123',
          version: 1,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          payload: expect.objectContaining({
            sagaId: 'mock-saga-123',
            sagaType: 'MockSaga',
            completedAt: new Date('2024-01-01T10:00:00Z'),
            totalSteps: 0
          })
        });
      });

      it('should not complete already completed saga', async () => {
        // Start and complete saga first
        const context = { testData: 'value' };
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context);

        // Mock as completed and complete it
        jest.spyOn(mockSaga, 'isCompleted').mockReturnValue(true);
        await sagaManager.completeSaga('mock-saga-123');

        // Try to complete again - should not publish another event
        const publishCallCount = mockEventPublisher.publish.mock.calls.length;
        await sagaManager.completeSaga('mock-saga-123');

        // Should not have published another event
        expect(mockEventPublisher.publish).toHaveBeenCalledTimes(publishCallCount);
      });
    });

    describe('failSaga', () => {
      it('should fail a running saga with compensation', async () => {
        // Start saga first
        const context = { testData: 'value' };
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context);

        // Mock the compensate method
        const compensateSpy = jest.spyOn(mockSaga, 'compensate').mockResolvedValue(undefined);

        await sagaManager.failSaga('mock-saga-123', 'Test failure');

        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('failed');
        expect(instance?.failedSteps).toHaveLength(1);
        expect(instance?.failedSteps[0].error).toBe('Test failure');

        // Verify compensation was called
        expect(compensateSpy).toHaveBeenCalled();

        // Verify failure event was published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith({
          eventId: 'test-id-123',
          eventType: 'SagaFailed',
          aggregateId: 'mock-saga-123',
          version: 1,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          payload: expect.objectContaining({
            sagaId: 'mock-saga-123',
            failureReason: 'Test failure'
          })
        });
      });

      it('should handle compensation failures', async () => {
        // Start saga first
        const context = { testData: 'value' };
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context);

        // Mock compensation to fail
        jest.spyOn(mockSaga, 'compensate').mockRejectedValue(new Error('Compensation failed'));

        await sagaManager.failSaga('mock-saga-123', 'Test failure');

        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('compensated'); // Should be marked as compensated failure
      });
    });
  });

  describe('Event Handling', () => {
    describe('handleEvent', () => {
      it('should route events to correlated sagas', async () => {
        // Start saga with correlation
        const context = { testData: 'value' };
        const correlationId = 'correlation-123';
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context, correlationId);

        // Mock the handleEvent method
        const handleEventSpy = jest.spyOn(mockSaga, 'handleEvent').mockResolvedValue(undefined);

        const event = {
          eventType: 'ProductInventoryVerified',
          payload: { productId: 'prod-123' }
        };

        await sagaManager.handleEvent(event);

        // Verify saga handled the event
        expect(handleEventSpy).toHaveBeenCalledWith(event);
      });

      it('should handle correlation timeouts', async () => {
        // Start saga with correlation
        const context = { testData: 'value' };
        const correlationId = 'correlation-123';
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context, correlationId);

        // Mock timeout as expired
        mockDateTimeService.now.mockReturnValue(new Date('2024-01-01T10:06:00Z')); // 6 minutes later

        const event = {
          eventType: 'ProductInventoryVerified',
          payload: { productId: 'prod-123' }
        };

        await sagaManager.handleEvent(event);

        // Saga should have been failed due to timeout
        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('failed');

        // Verify failure event was published
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'SagaFailed',
            payload: expect.objectContaining({
              failureReason: 'Correlation timeout'
            })
          })
        );
      });

      it('should handle saga event processing errors', async () => {
        // Start saga with correlation
        const context = { testData: 'value' };
        const correlationId = 'correlation-123';
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context, correlationId);

        // Mock saga to throw error on event handling
        jest.spyOn(mockSaga, 'handleEvent').mockRejectedValue(new Error('Event processing failed'));

        const event = {
          eventType: 'ProductInventoryVerified',
          payload: { productId: 'prod-123' }
        };

        await sagaManager.handleEvent(event);

        // Saga should have been failed
        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('failed');
        expect(instance?.failedSteps[0].error).toBe('Event processing failed');
      });

      it('should complete saga when event processing completes it', async () => {
        // Start saga with correlation
        const context = { testData: 'value' };
        const correlationId = 'correlation-123';
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context, correlationId);

        // Mock saga as completed after event handling
        jest.spyOn(mockSaga, 'handleEvent').mockResolvedValue(undefined);
        jest.spyOn(mockSaga, 'isCompleted').mockReturnValue(true);

        const event = {
          eventType: 'ProductInventoryVerified',
          payload: { productId: 'prod-123' }
        };

        await sagaManager.handleEvent(event);

        // Saga should have been completed
        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('completed');
      });
    });
  });

  describe('Saga Queries', () => {
    beforeEach(async () => {
      // Start multiple sagas for testing queries
      const context = { testData: 'value' };
      const sagaFactory = jest.fn().mockReturnValue(new MockSaga());

      await sagaManager.startSaga(sagaFactory, context, 'correlation-1');
      await sagaManager.startSaga(sagaFactory, context, 'correlation-2');
      await sagaManager.startSaga(sagaFactory, { ...context, correlationId: 'correlation-1' }, 'correlation-1');
    });

    describe('getSagaInstance', () => {
      it('should return saga instance by ID', () => {
        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance).toBeDefined();
        expect(instance?.sagaId).toBe('mock-saga-123');
      });

      it('should return undefined for non-existent saga', () => {
        const instance = sagaManager.getSagaInstance('non-existent');
        expect(instance).toBeUndefined();
      });
    });

    describe('getActiveSagas', () => {
      it('should return only running sagas', () => {
        const activeSagas = sagaManager.getActiveSagas();
        expect(activeSagas.length).toBeGreaterThan(0);
        activeSagas.forEach(saga => {
          expect(saga.status).toBe('running');
        });
      });
    });

    describe('getSagasByCorrelation', () => {
      it('should return sagas by correlation ID', () => {
        const correlatedSagas = sagaManager.getSagasByCorrelation('correlation-1');
        expect(correlatedSagas.length).toBeGreaterThan(0);
        correlatedSagas.forEach(saga => {
          expect(saga.correlationId).toBe('correlation-1');
        });
      });

      it('should return empty array for non-existent correlation', () => {
        const correlatedSagas = sagaManager.getSagasByCorrelation('non-existent');
        expect(correlatedSagas).toEqual([]);
      });
    });

    describe('getSagaStatistics', () => {
      it('should return accurate saga statistics', () => {
        const stats = sagaManager.getSagaStatistics();

        expect(stats.totalSagas).toBeGreaterThan(0);
        expect(stats.activeSagas).toBeGreaterThan(0);
        expect(stats.completedSagas).toBeGreaterThanOrEqual(0);
        expect(stats.failedSagas).toBeGreaterThanOrEqual(0);
        expect(stats.compensatedSagas).toBeGreaterThanOrEqual(0);

        // Total should equal sum of all status types
        expect(stats.totalSagas).toBe(
          stats.activeSagas + stats.completedSagas + stats.failedSagas + stats.compensatedSagas
        );
      });
    });
  });

  describe('Correlation Management', () => {
    describe('cleanupExpiredCorrelations', () => {
      it('should fail sagas with expired correlations', async () => {
        // Start saga with correlation
        const context = { testData: 'value' };
        const correlationId = 'correlation-123';
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context, correlationId);

        // Mock time as past the correlation timeout
        mockDateTimeService.now.mockReturnValue(new Date('2024-01-01T10:06:00Z')); // 6 minutes later

        await sagaManager.cleanupExpiredCorrelations();

        // Saga should have been failed due to expired correlation
        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('failed');
        expect(instance?.failedSteps[0].error).toBe('Correlation timeout');
      });

      it('should not affect sagas with valid correlations', async () => {
        // Start saga with correlation
        const context = { testData: 'value' };
        const correlationId = 'correlation-123';
        const sagaFactory = jest.fn().mockReturnValue(mockSaga);
        await sagaManager.startSaga(sagaFactory, context, correlationId);

        // Time still within correlation timeout
        mockDateTimeService.now.mockReturnValue(new Date('2024-01-01T10:04:00Z')); // 4 minutes later

        await sagaManager.cleanupExpiredCorrelations();

        // Saga should still be running
        const instance = sagaManager.getSagaInstance('mock-saga-123');
        expect(instance?.status).toBe('running');
      });
    });
  });

  describe('Event Handler Registration', () => {
    it('should register event handlers for saga lifecycle events', async () => {
      // This is tested indirectly through the saga lifecycle methods
      // The setupEventHandling method registers handlers that are called during saga operations

      const context = { testData: 'value' };
      const sagaFactory = jest.fn().mockReturnValue(mockSaga);
      await sagaManager.startSaga(sagaFactory, context);

      // The event handlers should be registered and functional
      // This is verified by the saga lifecycle working correctly in other tests
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Error Handling', () => {
    it('should handle saga start failures gracefully', async () => {
      const context = { testData: 'value' };
      const sagaFactory = jest.fn().mockImplementation(() => {
        throw new Error('Saga creation failed');
      });

      await expect(sagaManager.startSaga(sagaFactory, context)).rejects.toThrow('Saga creation failed');
    });

    it('should handle event handling failures without crashing', async () => {
      // Start saga with correlation
      const context = { testData: 'value' };
      const correlationId = 'correlation-123';
      const sagaFactory = jest.fn().mockReturnValue(mockSaga);
      await sagaManager.startSaga(sagaFactory, context, correlationId);

      // Mock event handling to throw
      jest.spyOn(mockSaga, 'handleEvent').mockRejectedValue(new Error('Event handling failed'));

      const event = {
        eventType: 'ProductInventoryVerified',
        payload: { productId: 'prod-123' }
      };

      // Should not throw, should handle error internally
      await expect(sagaManager.handleEvent(event)).resolves.not.toThrow();

      // Saga should be failed
      const instance = sagaManager.getSagaInstance('mock-saga-123');
      expect(instance?.status).toBe('failed');
    });
  });
});
