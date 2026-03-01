import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../events/eventBus'; // Unified event bus singleton
import { SagaLogEntry, SagaStatus, ISagaLogRepository, SagaStepStatus, SagaStepLog } from './saga.log';
import { createEventMetadata } from '../events/metadata';
import { withRetry, RetryPresets, RetryOptions } from '../utils/retry.util';
import { ISagaDeadLetterRepository } from './saga-dead-letter.repository';
import { Counter, Histogram, Gauge } from 'prom-client';
import { metricsRegistry } from '../metrics/metrics.factory';
import { createLogger } from '../logger/logger';

export interface SagaStep<T> {
    name: string;
    execute: (payload: T, sagaId: string) => Promise<void>;
    compensate: (payload: T, sagaId: string) => Promise<void>;
    validateCompensation?: (payload: T, sagaId: string) => Promise<boolean>;
}

// Module-level metrics shared across all saga types
const sagaStepDuration = new Histogram({
    name: 'saga_step_duration_seconds',
    help: 'Duration of saga steps in seconds',
    labelNames: ['sagaType', 'stepName', 'outcome'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [metricsRegistry]
}) as any;

const sagaFailures = new Counter({
    name: 'saga_failures_total',
    help: 'Total number of saga failures',
    labelNames: ['sagaType', 'failedStep'],
    registers: [metricsRegistry]
}) as any;

const sagaCompensations = new Counter({
    name: 'saga_compensations_total',
    help: 'Total number of saga compensations',
    labelNames: ['sagaType'],
    registers: [metricsRegistry]
}) as any;

const sagaDeadLetters = new Counter({
    name: 'saga_dead_letters_total',
    help: 'Total number of saga dead letter events',
    labelNames: ['sagaType', 'reason'],
    registers: [metricsRegistry]
}) as any;

const sagaActive = new Gauge({
    name: 'saga_active_total',
    help: 'Total number of active sagas',
    labelNames: ['sagaType', 'status'],
    registers: [metricsRegistry]
}) as any;

export abstract class DistributedSagaOrchestrator<T = any> {
    protected abstract sagaType: string;
    private steps: SagaStep<T>[] = [];
    private stepRetryOptions: Partial<RetryOptions>;
    private compensationRetryOptions: Partial<RetryOptions>;
    private deadLetterRepository?: ISagaDeadLetterRepository;
    protected readonly logger: any;

    constructor(
        protected readonly sagaLogRepository: ISagaLogRepository,
        protected readonly serviceName: string,
        protected readonly outbox?: any,
        stepRetryOptions?: Partial<RetryOptions>,
        compensationRetryOptions?: Partial<RetryOptions>,
        deadLetterRepository?: ISagaDeadLetterRepository
    ) {
        this.stepRetryOptions = stepRetryOptions ?? RetryPresets.STANDARD;
        this.compensationRetryOptions = compensationRetryOptions ?? RetryPresets.SLOW;
        this.deadLetterRepository = deadLetterRepository;
        this.logger = createLogger(this.constructor.name, serviceName);
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
        this.logger.info(`Saga ${this.sagaType} started: ${sagaId}`, { sagaId, sagaType: this.sagaType });
        sagaActive.labels(this.sagaType, 'STARTED').inc();

        // Invoke onStart hook
        try {
            await this.onStart(sagaId, payload, correlationId);
        } catch (err) {
            this.logger.error(`Error in onStart hook for saga ${sagaId}:`, err, { sagaId });
            // We continue as the saga entry is already persisted
        }

        // Start execution from the first step
        this.executeNextStep(sagaId, payload, 0).catch(err => {
            this.logger.error(`Unhandled error starting saga ${sagaId}:`, err, { sagaId });
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

            const startTime = Date.now();
            let outcome = 'success';
            try {
                const result = await withRetry(
                    () => step.execute(payload, sagaId),
                    {
                        ...this.stepRetryOptions,
                        onRetry: (attempt, error, delay) => {
                            this.logger.info(`Saga ${sagaId} step ${step.name} retry attempt ${attempt} after ${delay}ms: ${error.message}`, { sagaId, stepName: step.name, attempt });
                        }
                    }
                );

                if (!result.success) {
                    throw result.error;
                }
            } catch (error) {
                outcome = 'failure';
                throw error;
            } finally {
                const duration = (Date.now() - startTime) / 1000;
                sagaStepDuration.labels(this.sagaType, step.name, outcome).observe(duration);
            }

            await this.sagaLogRepository.updateStep(stepId, {
                status: SagaStepStatus.COMPLETED,
                completedAt: new Date()
            });

            // Proceed to next step
            await this.executeNextStep(sagaId, payload, stepIndex + 1);

        } catch (error: any) {
            this.logger.error(`Saga ${sagaId} failed at step ${step.name}:`, error, { sagaId, stepName: step.name });
            sagaFailures.labels(this.sagaType, step.name).inc();

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
            this.logger.error(`Error in onCompensate hook for saga ${sagaId}:`, err, { sagaId });
        }

        // Start compensation from the failed step backwards (key change: including failed step if it needs compensation, 
        // but typically compensation starts from the *successfully completed* steps. 
        // However, usually the failed step execution might have partially applied changes.
        // For simplicity and common pattern: Only compensate COMPLETED steps. 
        // If the failed step needs compensation, the execute method should catch and clean up or it should be marked as partially completed.
        // Assuming we compensate from failedStepIndex - 1 downwards.)

        await this.compensate(sagaId, payload, failedStepIndex - 1);
    }

    protected async rollback(sagaId: string): Promise<void> {
        const saga = await this.sagaLogRepository.getById(sagaId);
        if (!saga) throw new Error(`Saga ${sagaId} not found`);
        const stepIndex = this.steps.findIndex(s => s.name === saga.currentStep);
        await this.compensate(sagaId, saga.payload as T, stepIndex - 1);
    }

    protected context: T | undefined;
    protected sagaId: string = '';

    protected async compensate(sagaId: string, payload: T, stepIndex: number): Promise<void> {
        if (stepIndex < 0) {
            await this.markAsCompensated(sagaId);
            return;
        }

        const step = this.steps[stepIndex];
        this.logger.info(`Compensating step ${step.name} for saga ${sagaId}`, { sagaId, stepName: step.name });
        sagaCompensations.labels(this.sagaType).inc();

        const compensateResult = await withRetry(
            () => step.compensate(payload, sagaId),
            {
                ...this.compensationRetryOptions,
                onRetry: (attempt, error, delay) => {
                    this.logger.info(`Saga ${sagaId} compensate ${step.name} retry attempt ${attempt} after ${delay}ms: ${error.message}`, { sagaId, stepName: step.name, attempt });
                }
            }
        );

        if (!compensateResult.success) {
            this.logger.error(`Compensation exhausted retries for step ${step.name} in saga ${sagaId}`, compensateResult.error, { sagaId, stepName: step.name });
            await this.routeToDeadLetter(sagaId, payload, compensateResult.error?.message ?? 'Unknown compensation error', 'MAX_COMPENSATION_RETRIES_EXCEEDED');
            return;
        }

        // Validate compensation if hook is defined
        if (step.validateCompensation) {
            try {
                const isValid = await step.validateCompensation(payload, sagaId);
                if (!isValid) {
                    this.logger.error(`Compensation validation failed for step ${step.name} in saga ${sagaId}`, { sagaId, stepName: step.name });
                    await this.routeToDeadLetter(sagaId, payload, `Compensation validation failed for step ${step.name}`, 'COMPENSATION_VALIDATION_FAILED');
                    return;
                }
            } catch (validationError: any) {
                this.logger.error(`Compensation validation threw for step ${step.name} in saga ${sagaId}`, validationError, { sagaId, stepName: step.name });
                await this.routeToDeadLetter(sagaId, payload, validationError.message, 'COMPENSATION_VALIDATION_FAILED');
                return;
            }
        }

        // Proceed to previous step
        await this.compensate(sagaId, payload, stepIndex - 1);
    }

    private async routeToDeadLetter(sagaId: string, payload: T, lastError: string, reason: string): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.FAILED,
            updatedAt: new Date()
        });

        if (this.deadLetterRepository) {
            try {
                await this.deadLetterRepository.save({
                    sagaId,
                    sagaType: this.sagaType,
                    payload,
                    lastError,
                    reason
                });
                sagaDeadLetters.labels(this.sagaType, reason).inc();
            } catch (dlError) {
                this.logger.error(`Failed to write dead letter for saga ${sagaId}:`, dlError, { sagaId });
            }
        }

        this.logger.error(`[DEAD LETTER] Saga ${sagaId} (${this.sagaType}) routed to dead letter: ${reason} — ${lastError}`, { sagaId, sagaType: this.sagaType, reason });
    }

    protected async completeSaga(sagaId: string): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPLETED,
            updatedAt: new Date()
        });
        this.logger.info(`Saga ${this.sagaType} completed: ${sagaId}`, { sagaId, sagaType: this.sagaType });
        sagaActive.labels(this.sagaType, 'STARTED').dec();
        sagaActive.labels(this.sagaType, 'COMPLETED').inc();
    }

    protected async markAsCompensated(sagaId: string): Promise<void> {
        await this.sagaLogRepository.update(sagaId, {
            status: SagaStatus.COMPENSATED,
            updatedAt: new Date()
        });
        this.logger.info(`Saga ${this.sagaType} fully compensated: ${sagaId}`, { sagaId, sagaType: this.sagaType });
        sagaActive.labels(this.sagaType, 'STARTED').dec();
        sagaActive.labels(this.sagaType, 'COMPENSATED').inc();
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
     * Resume a stuck saga — re-executes or re-compensates based on current status
     */
    async resume(sagaId: string): Promise<void> {
        const saga = await this.sagaLogRepository.getById(sagaId);
        if (!saga) throw new Error(`Saga ${sagaId} not found`);

        if (saga.status === SagaStatus.STARTED || saga.status === SagaStatus.IN_PROGRESS) {
            const stepIndex = this.steps.findIndex(s => s.name === saga.currentStep);
            if (stepIndex === -1) {
                console.error(`Cannot resume saga ${sagaId}: step ${saga.currentStep} not found`);
                return;
            }
            console.log(`Resuming saga ${sagaId} at step ${saga.currentStep} (index ${stepIndex})`);
            await this.executeNextStep(sagaId, saga.payload as T, stepIndex);
            return;
        }

        if (saga.status === SagaStatus.COMPENSATING) {
            const steps = await this.sagaLogRepository.getSteps(sagaId);
            const lastActiveStep = [...steps].reverse().find(
                s => s.status === SagaStepStatus.STARTED || s.status === SagaStepStatus.FAILED
            );
            if (!lastActiveStep) {
                console.log(`Saga ${sagaId} has no active/failed steps to compensate, marking compensated`);
                await this.markAsCompensated(sagaId);
                return;
            }
            const stepIndex = this.steps.findIndex(s => s.name === lastActiveStep.stepName);
            if (stepIndex === -1) {
                console.error(`Cannot resume compensation for saga ${sagaId}: step ${lastActiveStep.stepName} not found`);
                return;
            }
            this.logger.info(`Resuming compensation for saga ${sagaId} at step ${lastActiveStep.stepName} (index ${stepIndex})`, { sagaId, stepName: lastActiveStep.stepName });
            await this.compensate(sagaId, saga.payload as T, stepIndex);
            return;
        }

        // COMPLETED, COMPENSATED, FAILED — nothing to recover
        this.logger.info(`Saga ${sagaId} is in terminal state ${saga.status}, skipping resume`, { sagaId, status: saga.status });
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


