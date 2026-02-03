/**
 * Saga Manager
 * Coordinates and manages multiple saga instances
 * Handles event correlation, saga lifecycle, and state persistence
 */

import { BaseSaga } from './index';
import { DomainEventPublisher, IdGenerator, DateTimeService } from '../../domain/interfaces';
import { eventHandlerRegistry } from '../handlers';

export interface SagaInstance {
  sagaId: string;
  sagaType: string;
  state: any;
  status: 'running' | 'completed' | 'failed' | 'compensated';
  createdAt: Date;
  updatedAt: Date;
  completedSteps: string[];
  failedSteps: Array<{ stepId: string; error: string; timestamp: Date }>;
  correlationId?: string;
}

export interface SagaCorrelation {
  sagaId: string;
  correlationId: string;
  eventTypes: string[];
  timeout?: Date;
}

/**
 * Saga Manager
 * Central coordinator for saga orchestration
 */
export class SagaManager {
  private activeSagas: Map<string, BaseSaga> = new Map();
  private sagaInstances: Map<string, SagaInstance> = new Map();
  private correlations: Map<string, SagaCorrelation> = new Map();
  private eventSubscriptions: Map<string, string[]> = new Map(); // eventType -> sagaIds

  constructor(
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {
    this.setupEventHandling();
  }

  /**
   * Start a new saga instance
   */
  async startSaga<T extends BaseSaga>(
    sagaFactory: (context: any) => T,
    context: any,
    correlationId?: string
  ): Promise<string> {
    try {
      // Create saga instance
      const saga = sagaFactory(context);
      const sagaId = saga.sagaId;

      // Store saga instance
      this.activeSagas.set(sagaId, saga);

      // Create saga instance record
      const sagaInstance: SagaInstance = {
        sagaId,
        sagaType: saga.sagaType,
        state: saga.getState(),
        status: 'running',
        createdAt: this.dateTimeService.now(),
        updatedAt: this.dateTimeService.now(),
        completedSteps: [],
        failedSteps: [],
        correlationId
      };

      this.sagaInstances.set(sagaId, sagaInstance);

      // Set up event correlation if correlation ID provided
      if (correlationId) {
        this.setupSagaCorrelation(sagaId, correlationId, saga);
      }

      console.log(`[${this.constructor.name}] Started saga ${sagaId} (${saga.sagaType})`);

      // Start saga execution
      await saga.start(context);

      // Update instance after initial execution
      this.updateSagaInstance(sagaId, saga);

      return sagaId;

    } catch (error) {
      console.error(`[${this.constructor.name}] Failed to start saga:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Handle event for correlated sagas
   */
  async handleEvent(event: any): Promise<void> {
    const eventType = event.eventType;
    const sagaIds = this.eventSubscriptions.get(eventType) || [];

    for (const sagaId of sagaIds) {
      try {
        const saga = this.activeSagas.get(sagaId);
        if (!saga) {
          console.warn(`Saga ${sagaId} not found for event ${eventType}`);
          continue;
        }

        // Check correlation if applicable
        const correlation = this.correlations.get(sagaId);
        if (correlation) {
          if (correlation.timeout && this.dateTimeService.now() > correlation.timeout) {
            console.log(`Saga ${sagaId} correlation timeout expired`);
            await this.failSaga(sagaId, 'Correlation timeout');
            continue;
          }
        }

        console.log(`[${this.constructor.name}] Routing event ${eventType} to saga ${sagaId}`);

        // Handle event in saga
        await saga.handleEvent(event);

        // Update saga instance
        this.updateSagaInstance(sagaId, saga);

        // Check if saga completed
        if (saga.isCompleted()) {
          await this.completeSaga(sagaId);
        }

      } catch (error) {
        console.error(`[${this.constructor.name}] Saga ${sagaId} failed to handle event ${eventType}:`, error instanceof Error ? error.message : String(error));
        await this.failSaga(sagaId, error instanceof Error ? error.message : String(error));
      }
    }
  }

  /**
   * Get saga instance by ID
   */
  getSagaInstance(sagaId: string): SagaInstance | undefined {
    return this.sagaInstances.get(sagaId);
  }

  /**
   * Get all active sagas
   */
  getActiveSagas(): SagaInstance[] {
    return Array.from(this.sagaInstances.values()).filter(instance => instance.status === 'running');
  }

  /**
   * Get sagas by correlation ID
   */
  getSagasByCorrelation(correlationId: string): SagaInstance[] {
    return Array.from(this.sagaInstances.values()).filter(instance => instance.correlationId === correlationId);
  }

  /**
   * Manually fail a saga
   */
  async failSaga(sagaId: string, reason: string): Promise<void> {
    const saga = this.activeSagas.get(sagaId);
    const instance = this.sagaInstances.get(sagaId);

    if (!instance || instance.status !== 'running') {
      return;
    }

    console.log(`[${this.constructor.name}] Failing saga ${sagaId}: ${reason}`);

    try {
      // Attempt compensation
      if (saga) {
        await saga.compensate();
      }

      // Update instance
      instance.status = 'failed';
      instance.updatedAt = this.dateTimeService.now();
      instance.failedSteps.push({
        stepId: 'manual_failure',
        error: reason,
        timestamp: this.dateTimeService.now()
      });

      // Clean up
      this.activeSagas.delete(sagaId);
      this.cleanupSagaCorrelations(sagaId);

      // Publish failure event
      await this.eventPublisher.publish({
        eventId: this.idGenerator.generate(),
        eventType: 'SagaFailed',
        aggregateId: sagaId,
        version: 1,
        timestamp: this.dateTimeService.now(),
        payload: {
          sagaId,
          sagaType: instance.sagaType,
          failureReason: reason,
          failedAt: this.dateTimeService.now()
        }
      });

    } catch (compensationError) {
      console.error(`[${this.constructor.name}] Compensation failed for saga ${sagaId}:`, compensationError);

      // Mark as compensated failure
      instance.status = 'compensated';
      instance.updatedAt = this.dateTimeService.now();
    }
  }

  /**
   * Manually complete a saga
   */
  async completeSaga(sagaId: string): Promise<void> {
    const saga = this.activeSagas.get(sagaId);
    const instance = this.sagaInstances.get(sagaId);

    if (!instance || instance.status !== 'running') {
      return;
    }

    console.log(`[${this.constructor.name}] Completing saga ${sagaId}`);

    // Update instance
    instance.status = 'completed';
    instance.updatedAt = this.dateTimeService.now();

    // Clean up
    this.activeSagas.delete(sagaId);
    this.cleanupSagaCorrelations(sagaId);

    // Publish completion event
    await this.eventPublisher.publish({
      eventId: this.idGenerator.generate(),
      eventType: 'SagaCompleted',
      aggregateId: sagaId,
      version: 1,
      timestamp: this.dateTimeService.now(),
      payload: {
        sagaId,
        sagaType: instance.sagaType,
        completedAt: this.dateTimeService.now(),
        totalSteps: instance.completedSteps.length
      }
    });
  }

  /**
   * Get saga statistics
   */
  getSagaStatistics(): {
    totalSagas: number;
    activeSagas: number;
    completedSagas: number;
    failedSagas: number;
    compensatedSagas: number;
  } {
    const instances = Array.from(this.sagaInstances.values());
    const active = this.activeSagas.size;

    return {
      totalSagas: instances.length,
      activeSagas: active,
      completedSagas: instances.filter(i => i.status === 'completed').length,
      failedSagas: instances.filter(i => i.status === 'failed').length,
      compensatedSagas: instances.filter(i => i.status === 'compensated').length
    };
  }

  /**
   * Clean up expired correlations
   */
  async cleanupExpiredCorrelations(): Promise<void> {
    const now = this.dateTimeService.now();
    const expiredCorrelations: string[] = [];

    for (const [sagaId, correlation] of this.correlations) {
      if (correlation.timeout && now > correlation.timeout) {
        expiredCorrelations.push(sagaId);
      }
    }

    for (const sagaId of expiredCorrelations) {
      console.log(`[${this.constructor.name}] Cleaning up expired correlation for saga ${sagaId}`);
      await this.failSaga(sagaId, 'Correlation timeout');
    }
  }

  private setupEventHandling(): void {
    // Register saga manager as event handler for saga-related events
    eventHandlerRegistry.register({
      eventType: 'SagaStepCompleted',
      handle: async (event) => {
        const { sagaId, stepId } = event.payload;
        const instance = this.sagaInstances.get(sagaId);
        if (instance) {
          instance.completedSteps.push(stepId);
          instance.updatedAt = this.dateTimeService.now();
        }
      }
    });

    eventHandlerRegistry.register({
      eventType: 'SagaStepFailed',
      handle: async (event) => {
        const { sagaId, stepId, error } = event.payload;
        const instance = this.sagaInstances.get(sagaId);
        if (instance) {
          instance.failedSteps.push({
            stepId,
            error,
            timestamp: this.dateTimeService.now()
          });
          instance.updatedAt = this.dateTimeService.now();
        }
      }
    });
  }

  private setupSagaCorrelation(sagaId: string, correlationId: string, saga: BaseSaga): void {
    // Define events this saga is interested in
    const eventTypes = [
      'ProductInventoryVerified',
      'ProductInventoryVerificationFailed',
      'ProductInventoryUpdated',
      'CategoryDeactivated',
      'ProductDeleted'
    ];

    const correlation: SagaCorrelation = {
      sagaId,
      correlationId,
      eventTypes,
      timeout: new Date(Date.now() + 5 * 60 * 1000) // 5 minute timeout
    };

    this.correlations.set(sagaId, correlation);

    // Subscribe saga to events
    for (const eventType of eventTypes) {
      if (!this.eventSubscriptions.has(eventType)) {
        this.eventSubscriptions.set(eventType, []);
      }
      this.eventSubscriptions.get(eventType)!.push(sagaId);
    }

    console.log(`[${this.constructor.name}] Set up correlation for saga ${sagaId} with ID ${correlationId}`);
  }

  private updateSagaInstance(sagaId: string, saga: BaseSaga): void {
    const instance = this.sagaInstances.get(sagaId);
    if (instance) {
      instance.state = saga.getState();
      instance.updatedAt = this.dateTimeService.now();

      if (saga.isCompleted()) {
        instance.status = 'completed';
      }
    }
  }

  private cleanupSagaCorrelations(sagaId: string): void {
    // Remove from correlations
    this.correlations.delete(sagaId);

    // Remove from event subscriptions
    for (const [eventType, sagaIds] of this.eventSubscriptions) {
      const index = sagaIds.indexOf(sagaId);
      if (index !== -1) {
        sagaIds.splice(index, 1);
        if (sagaIds.length === 0) {
          this.eventSubscriptions.delete(eventType);
        }
      }
    }
  }
}

/**
 * Saga Factory Interface
 * Defines contract for creating saga instances
 */
export interface ISagaFactory {
  createProductPublishingSaga(context: any): any;
  createBulkProductUpdateSaga(context: any): any;
  // Add other saga factories as needed
}

/**
 * Global Saga Manager Instance
 */
export const sagaManager = (dependencies: {
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}) => new SagaManager(
  dependencies.eventPublisher,
  dependencies.idGenerator,
  dependencies.dateTimeService
);
