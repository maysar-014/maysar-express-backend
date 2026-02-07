/**
 * Saga Manager
 * Coordinates and manages multiple saga instances
 * Handles event correlation, saga lifecycle, and state persistence
 */

import { DistributedSagaOrchestrator } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository, SagaStatus } from '../../../../../shared/saga/saga.log';
import { DomainEventPublisher, IdGenerator, DateTimeService } from '../../domain/interfaces';
import { eventHandlerRegistry } from '../handlers';

export interface SagaInstance {
  sagaId: string;
  sagaType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  currentStep: string;
}

/**
 * Saga Manager
 * Central coordinator for saga orchestration
 */
export class SagaManager {
  private orchestrators: Map<string, DistributedSagaOrchestrator> = new Map();

  constructor(
    private readonly sagaLogRepository: ISagaLogRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly idGenerator: IdGenerator,
    private readonly dateTimeService: DateTimeService
  ) {
    this.setupEventHandling();
  }

  registerOrchestrator(sagaType: string, orchestrator: DistributedSagaOrchestrator): void {
    this.orchestrators.set(sagaType, orchestrator);
  }

  /**
   * Start a new saga instance
   */
  async startSaga<T = any>(
    sagaType: string,
    payload: T,
    correlationId?: string
  ): Promise<string> {
    const orchestrator = this.orchestrators.get(sagaType);
    if (!orchestrator) {
      throw new Error(`Orchestrator for saga type ${sagaType} not registered`);
    }

    const sagaId = await orchestrator.start(payload, correlationId);
    console.log(`[${this.constructor.name}] Started saga ${sagaId} (${sagaType})`);
    return sagaId;
  }

  /**
   * Handle event for correlated sagas
   * In the new distributed model, events are usually handled by specific handlers
   * that call the orchestrator's completeStep/failStep methods.
   * This method remains for compatibility or generic routing.
   */
  async handleEvent(event: any): Promise<void> {
    const sagaId = event.metadata?.sagaId || event.payload?.sagaId;
    if (!sagaId) return;

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
  async getSagaInstance(sagaId: string): Promise<SagaInstance | undefined> {
    const entry = await this.sagaLogRepository.getById(sagaId);
    if (!entry) return undefined;

    return {
      sagaId: entry.sagaId,
      sagaType: entry.sagaType,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      currentStep: entry.currentStep
    };
  }

  /**
   * Manually fail a saga
   */
  async failSaga(sagaId: string, reason: string): Promise<void> {
    const entry = await this.sagaLogRepository.getById(sagaId);
    if (!entry) return;

    const orchestrator = this.orchestrators.get(entry.sagaType);
    if (orchestrator) {
      await (orchestrator as any).failStep(sagaId, entry.currentStep, reason);
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

