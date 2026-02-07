import { logger } from '../../infrastructure/services/logger.service';

export class SagaError extends Error {
    public readonly context: Record<string, any>;

    constructor(message: string, context: Record<string, any> = {}) {
        super(message);
        this.name = 'SagaError';
        this.context = context;
    }
}

export interface SagaStepOptions {
    maxRetries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
}

export interface SagaStep<T = any> {
    name: string;
    execute: (context: T) => Promise<void>;
    compensate: (context: T) => Promise<void>;
    options?: SagaStepOptions;
}

export class BaseSaga<T = any> {
    protected steps: SagaStep<T>[] = [];
    protected context: T;
    protected idempotencyKey: string;

    constructor(idempotencyKey: string, context: T) {
        this.idempotencyKey = idempotencyKey;
        this.context = context;
    }

    addStep(step: SagaStep<T>): void {
        this.steps.push(step);
    }

    async execute(): Promise<void> {
        const executedSteps: SagaStep<T>[] = [];

        try {
            for (const step of this.steps) {
                const timeout = step.options?.timeoutMs || 30000;
                await this.executeWithTimeout(step, this.context, timeout);
                executedSteps.push(step);
                logger.info(`Saga step completed: ${step.name}`, { idempotencyKey: this.idempotencyKey });
            }
        } catch (error) {
            logger.error(`Saga step failed: ${error}`, { error, idempotencyKey: this.idempotencyKey });
            await this.compensate(executedSteps);
            throw error;
        }
    }

    private async executeWithTimeout(step: SagaStep<T>, context: T, timeoutMs: number): Promise<void> {
        let timeoutId: NodeJS.Timeout | null = null;
        try {
            return await Promise.race([
                step.execute(context),
                new Promise<void>((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error(`Step timeout: ${step.name}`)), timeoutMs);
                })
            ]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    protected async compensate(executedSteps: Array<SagaStep<T>>): Promise<void> {
        for (let i = executedSteps.length - 1; i >= 0; i--) {
            const step = executedSteps[i];
            try {
                await step.compensate(this.context);
                logger.info(`Saga compensation completed: ${step.name}`, { idempotencyKey: this.idempotencyKey });
            } catch (error) {
                logger.error(`Saga compensation failed: ${step.name}`, { error, idempotencyKey: this.idempotencyKey });
            }
        }
    }
}
