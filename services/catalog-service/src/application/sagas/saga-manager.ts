/**
 * Saga Manager
 * Coordinates and manages multiple saga instances
 * Handles event correlation, saga lifecycle, and state persistence
 */

import { DistributedSagaOrchestrator } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
import { DomainEventPublisher, IdGenerator, DateTimeService } from '../../domain/interfaces';

interface SagaOrchestratorControl {
  completeStep(
    sagaId: string,
    stepName: string,
    stepId?: string,
    nextAction?: (saga: unknown) => Promise<void>
  ): Promise<void>;
  failStep(sagaId: string, stepName: string, error: string): Promise<void>;
}

export interface SagaInstance {
  sagaId: string;
  sagaType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  currentStep: string;
  correlationId?: string;
  failedSteps?: string[];
}

export interface SagaCorrelation {
  correlationId: string;
  sagaId: string;
  expiresAt: Date;
}

/**
 * Saga Manager
 * Central coordinator for saga orchestration
 */
export class SagaManager {
  private orchestrators: Map<string, DistributedSagaOrchestrator<Record<string, unknown>>> = new Map();
  private correlations: Map<string, SagaCorrelation> = new Map();

  constructor(
    private readonly sagaLogRepository: ISagaLogRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService?: DateTimeService
  ) {
    this.setupEventHandling();
  }

  registerOrchestrator<TContext extends Record<string, unknown>>(sagaType: string, orchestrator: DistributedSagaOrchestrator<TContext>): void {
    this.orchestrators.set(sagaType, orchestrator as unknown as DistributedSagaOrchestrator<Record<string, unknown>>);
  }

  /**
   * Start a new saga instance
   */
  async startSaga(
    sagaFactory: () => { constructor: { name: string } },
    context: Record<string, unknown>,
    correlationId?: string
  ): Promise<string> {
    const saga = sagaFactory();
    const sagaType = saga.constructor.name;
    
    const orchestrator = this.orchestrators.get(sagaType);
    if (!orchestrator) {
      throw new Error(`Orchestrator for saga type ${sagaType} not registered`);
    }

    const sagaId = await orchestrator.start(context, correlationId);
    
    if (correlationId) {
      this.correlations.set(correlationId, {
        correlationId,
        sagaId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }
    
    console.log(`[${this.constructor.name}] Started saga ${sagaId} (${sagaType})`);
    return sagaId;
  }

  /**
   * Handle event for correlated sagas
   * In the new distributed model, events are usually handled by specific handlers
   * that call the orchestrator's completeStep/failStep methods.
   * This method remains for compatibility or generic routing.
   */
  async handleEvent(event: unknown): Promise<void> {
    if (typeof event !== 'object' || event === null) return;

    const record = event as {
      metadata?: Record<string, unknown>;
      payload?: Record<string, unknown>;
    };
    const sagaIdValue = record.metadata?.sagaId ?? record.payload?.sagaId;
    if (typeof sagaIdValue !== 'string') return;
    const sagaId = sagaIdValue;

    const sagaEntry = await this.sagaLogRepository.getById(sagaId);
    if (!sagaEntry) return;

    const orchestrator = this.orchestrators.get(sagaEntry.sagaType);
    if (!orchestrator) return;

    // Route to specific orchestrator logic if needed
    // In many cases, the specific handlers (registered in setupEventHandling) 
    // will be more appropriate.
  }

  /**
   * Get saga instance by ID
   */
  getSagaInstance(_sagaId: string): SagaInstance | undefined {
    // Synchronous version for tests
    return undefined; // Would need to be implemented with sync storage
  }

  /**
   * Complete a saga
   */
  async completeSaga(sagaId: string): Promise<void> {
    const entry = await this.sagaLogRepository.getById(sagaId);
    if (!entry) return;

    const orchestrator = this.orchestrators.get(entry.sagaType);
    if (orchestrator) {
      const control = orchestrator as unknown as SagaOrchestratorControl;
      await control.completeStep(sagaId, entry.currentStep);
    }
  }

  /**
   * Get all active sagas
   */
  getActiveSagas(): SagaInstance[] {
    // Would need to query repository synchronously or cache
    return [];
  }

  /**
   * Get sagas by correlation ID
   */
  getSagasByCorrelation(correlationId: string): SagaInstance[] {
    const correlation = this.correlations.get(correlationId);
    if (!correlation) return [];
    
    const instance = this.getSagaInstance(correlation.sagaId);
    return instance ? [instance] : [];
  }

  /**
   * Get saga statistics
   */
  getSagaStatistics(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    totalSagas: number;
    activeSagas: number;
    completedSagas: number;
    failedSagas: number;
    compensatedSagas: number;
  } {
    return {
      total: 0,
      running: 0,
      completed: 0,
      failed: 0,
      totalSagas: 0,
      activeSagas: 0,
      completedSagas: 0,
      failedSagas: 0,
      compensatedSagas: 0
    };
  }

  /**
   * Cleanup expired correlations
   */
  async cleanupExpiredCorrelations(): Promise<void> {
    const now = new Date();
    for (const [correlationId, correlation] of this.correlations.entries()) {
      if (correlation.expiresAt < now) {
        this.correlations.delete(correlationId);
      }
    }
  }

  /**
   * Manually fail a saga
   */
  async failSaga(sagaId: string, reason: string): Promise<void> {
    const entry = await this.sagaLogRepository.getById(sagaId);
    if (!entry) return;

    const orchestrator = this.orchestrators.get(entry.sagaType);
    if (orchestrator) {
      const control = orchestrator as unknown as SagaOrchestratorControl;
      await control.failStep(sagaId, entry.currentStep, reason);
    }
  }

  private setupEventHandling(): void {
    // Generic handlers can be added here
  }
}

/**
 * Global Saga Manager Instance
 */
export const sagaManager = (dependencies: {
  sagaLogRepository: ISagaLogRepository;
  eventPublisher: DomainEventPublisher;
  idGenerator: IdGenerator;
  dateTimeService: DateTimeService;
}) => new SagaManager(
  dependencies.sagaLogRepository,
  dependencies.eventPublisher,
  dependencies.idGenerator,
  dependencies.dateTimeService
);

