import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../events/eventBus';
import { SagaLogEntry, SagaStatus, ISagaLogRepository, SagaStepStatus, SagaStepLog } from './saga.log';
import { createEventMetadata } from '../events/metadata';

export abstract class DistributedSagaOrchestrator<T = any, C = any> {
    protected abstract sagaType: string;

    constructor(
        protected readonly sagaLogRepository: ISagaLogRepository,
        protected readonly serviceName: string
    ) { }

    /**
     * Start a new saga instance
     */
    async start(payload: T, correlationId?: string): Promise<string> {
        const sagaId = uuidv4();
        const entry: SagaLogEntry = {
            sagaId,
            sagaType: this.sagaType,
            status: SagaStatus.STARTED,
            currentStep: 'START',
            payload,
            context: {} as C,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await this.sagaLogRepository.save(entry);

        console.log(`Saga ${this.sagaType} started: ${sagaId}`);

        // Trigger the first step
        await this.onStart(sagaId, payload);

        return sagaId;
    }

    /**
     * Hook for custom start logic (usually publishing the first command)
     */
    protected abstract onStart(sagaId: string, payload: T): Promise<void>;

    /**
     * Handle successful completion of a step
     */
    protected async completeStep(
        sagaId: string,
        stepName: string,
        nextStep?: (saga: SagaLogEntry) => Promise<void>
    ): Promise<void> {
        const saga = await this.getSagaOrThrow(sagaId);

        // Update step status if tracked (optional refinement)
        // For now, focus on the main saga flow

        if (nextStep) {
            await nextStep(saga);
        } else {
            await this.completeSaga(sagaId);
        }
    }

    /**
     * Handle failure of a step and initiate compensation
     */
    protected async failStep(sagaId: string, stepName: string, error: string): Promise<void> {
        console.error(`Saga ${sagaId} failed at step ${stepName}: ${error}`);

        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPENSATING,
            error,
            updatedAt: new Date()
        });

        await this.onCompensate(sagaId, stepName);
    }

    /**
     * Hook for custom compensation logic
     */
    protected abstract onCompensate(sagaId: string, failedStepName: string): Promise<void>;

    /**
     * Finalize saga as completed
     */
    protected async completeSaga(sagaId: string): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPLETED,
            updatedAt: new Date()
        });
        console.log(`Saga ${this.sagaType} completed: ${sagaId}`);
    }

    /**
     * Finalize saga as compensated
     */
    protected async markAsCompensated(sagaId: string): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPENSATED,
            updatedAt: new Date()
        });
        console.log(`Saga ${this.sagaType} compensated: ${sagaId}`);
    }

    protected async getSagaOrThrow(sagaId: string): Promise<SagaLogEntry> {
        const saga = await this.sagaLogRepository.getById(sagaId);
        if (!saga) throw new Error(`Saga ${sagaId} not found`);
        return saga;
    }

    /**
     * Helper to publish a command with standardized metadata
     */
    protected async publishCommand(
        commandType: string,
        payload: any,
        correlationId: string,
        transaction?: any
    ): Promise<void> {
        const metadata = createEventMetadata(this.serviceName, {
            correlationId,
            idempotencyKey: `${commandType}-${correlationId}`
        });

        // Note: In Phase 2, we integrate with the Outbox pattern
        // This assumes the eventBus is either the KafkaEventBus or a bridge to the outbox
        await eventBus.publish(commandType, payload, metadata);
    }
}
