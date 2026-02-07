import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../events/eventBus';
import { SagaLogEntry, SagaStatus, ISagaLogRepository, SagaStepStatus, SagaStepLog } from './saga.log';
import { createEventMetadata } from '../events/metadata';

export interface SagaStep<T> {
    name: string;
    execute: (payload: T, sagaId: string) => Promise<void>;
    compensate: (payload: T, sagaId: string) => Promise<void>;
}

export abstract class DistributedSagaOrchestrator<T = any> {
    protected abstract sagaType: string;
    private steps: SagaStep<T>[] = [];

    constructor(
        protected readonly sagaLogRepository: ISagaLogRepository,
        protected readonly serviceName: string,
        protected readonly outbox?: any
    ) {
        this.steps = this.defineSteps();
    }

    protected abstract defineSteps(): SagaStep<T>[];

    /**
     * Optional lifecycle hooks
     */
    protected async onStart(sagaId: string, payload: T, correlationId?: string): Promise<void> { }
    protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> { }

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
            context: { correlationId } as any,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await this.sagaLogRepository.save(entry);
        console.log(`Saga ${this.sagaType} started: ${sagaId}`);

        // Invoke onStart hook
        try {
            await this.onStart(sagaId, payload, correlationId);
        } catch (err) {
            console.error(`Error in onStart hook for saga ${sagaId}:`, err);
            // We continue as the saga entry is already persisted
        }

        // Start execution from the first step
        this.executeNextStep(sagaId, payload, 0).catch(err => {
            console.error(`Unhandled error starting saga ${sagaId}:`, err);
        });

        return sagaId;
    }

    private async executeNextStep(sagaId: string, payload: T, stepIndex: number): Promise<void> {
        if (stepIndex >= this.steps.length) {
            await this.completeSaga(sagaId);
            return;
        }

        const step = this.steps[stepIndex];
        const stepId = uuidv4();

        try {
            await this.sagaLogRepository.saveStep({
                id: stepId,
                sagaId,
                stepName: step.name,
                status: SagaStepStatus.STARTED,
                startedAt: new Date()
            });

            await this.sagaLogRepository.update(sagaId, {
                currentStep: step.name,
                updatedAt: new Date()
            });

            await step.execute(payload, sagaId);

            await this.sagaLogRepository.updateStep(stepId, {
                status: SagaStepStatus.COMPLETED,
                completedAt: new Date()
            });

            // Proceed to next step
            await this.executeNextStep(sagaId, payload, stepIndex + 1);

        } catch (error: any) {
            console.error(`Saga ${sagaId} failed at step ${step.name}:`, error);

            await this.sagaLogRepository.updateStep(stepId, {
                status: SagaStepStatus.FAILED,
                error: error.message,
                completedAt: new Date()
            });

            await this.failSaga(sagaId, step.name, error.message, payload, stepIndex);
        }
    }
    private async failSaga(sagaId: string, failedStepName: string, error: string, payload: T, failedStepIndex: number): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPENSATING,
            error,
            updatedAt: new Date()
        });

        // Invoke onCompensate hook
        try {
            await this.onCompensate(sagaId, failedStepName);
        } catch (err) {
            console.error(`Error in onCompensate hook for saga ${sagaId}:`, err);
        }

        // Start compensation from the failed step backwards (key change: including failed step if it needs compensation, 
        // but typically compensation starts from the *successfully completed* steps. 
        // However, usually the failed step execution might have partially applied changes.
        // For simplicity and common pattern: Only compensate COMPLETED steps. 
        // If the failed step needs compensation, the execute method should catch and clean up or it should be marked as partially completed.
        // Assuming we compensate from failedStepIndex - 1 downwards.)

        await this.compensate(sagaId, payload, failedStepIndex - 1);
    }

    private async compensate(sagaId: string, payload: T, stepIndex: number): Promise<void> {
        if (stepIndex < 0) {
            await this.markAsCompensated(sagaId);
            return;
        }

        const step = this.steps[stepIndex];
        console.log(`Compensating step ${step.name} for saga ${sagaId}`);

        try {
            // Log compensation start if needed
            await step.compensate(payload, sagaId);

            // Proceed to previous step
            await this.compensate(sagaId, payload, stepIndex - 1);
        } catch (error) {
            console.error(`Compensation failed for step ${step.name} in saga ${sagaId}`, error);
            // In a real system, we might need manual intervention here
            // We'll log it and continue compensating others or stop? 
            // Usually best effort compensation.
            await this.compensate(sagaId, payload, stepIndex - 1);
        }
    }

    protected async completeSaga(sagaId: string): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPLETED,
            updatedAt: new Date()
        });
        console.log(`Saga ${this.sagaType} completed: ${sagaId}`);
    }

    protected async markAsCompensated(sagaId: string): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPENSATED,
            updatedAt: new Date()
        });
        console.log(`Saga ${this.sagaType} fully compensated: ${sagaId}`);
    }

    /**
     * Complete a step and proceed to the next one
     */
    protected async completeStep(
        sagaId: string,
        stepName: string,
        stepId?: string,
        nextAction?: (saga: SagaLogEntry) => Promise<void>
    ): Promise<void> {
        const saga = await this.sagaLogRepository.getById(sagaId);
        if (!saga) throw new Error(`Saga ${sagaId} not found`);

        const stepIndex = this.steps.findIndex(s => s.name === stepName);
        if (stepIndex === -1) throw new Error(`Step ${stepName} not found in saga ${this.sagaType}`);

        // Find and update step status in log
        let targetStepId = stepId;
        if (!targetStepId) {
            const steps = await this.sagaLogRepository.getSteps(sagaId);
            const latestStep = [...steps].reverse().find(s => s.stepName === stepName && s.status === SagaStepStatus.STARTED);
            targetStepId = latestStep?.id;
        }

        if (targetStepId) {
            await this.sagaLogRepository.updateStep(targetStepId, {
                status: SagaStepStatus.COMPLETED,
                completedAt: new Date()
            });
        }

        await this.sagaLogRepository.update(sagaId, {
            updatedAt: new Date()
        });

        if (nextAction) {
            await nextAction(saga);
        } else {
            await this.executeNextStep(sagaId, saga.payload as T, stepIndex + 1);
        }
    }

    /**
     * Mark a step as failed and initiate compensation
     */
    protected async failStep(sagaId: string, stepName: string, error: string): Promise<void> {
        const saga = await this.sagaLogRepository.getById(sagaId);
        if (!saga) throw new Error(`Saga ${sagaId} not found`);

        const stepIndex = this.steps.findIndex(s => s.name === stepName);
        if (stepIndex === -1) throw new Error(`Step ${stepName} not found in saga ${this.sagaType}`);

        await this.failSaga(sagaId, stepName, error, saga.payload as T, stepIndex);
    }

    /**
     * Helper to get saga state
     */
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
        sagaId?: string,
        transaction?: any
    ): Promise<void> {
        const metadata = createEventMetadata(this.serviceName, {
            correlationId,
            idempotencyKey: `${commandType}-${correlationId}`
        });

        if (sagaId) {
            (metadata as any).sagaId = sagaId;
        }

        if (this.outbox) {
            await this.outbox.saveEvent({
                eventType: commandType,
                data: payload,
                metadata
            }, transaction);
        } else {
            await eventBus.publish(commandType, payload, metadata);
        }
    }
}


