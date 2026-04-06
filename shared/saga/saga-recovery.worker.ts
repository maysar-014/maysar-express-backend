import { ISagaLogRepository, SagaStatus } from './saga.log';
import { DistributedSagaOrchestrator } from './saga.orchestrator';
import { isSagaRecoveryEnabled } from '../runtime/background-workers';

export interface SagaRecoveryWorkerOptions {
    stuckThresholdMs: number;   // default: 5 * 60 * 1000 (5 min)
    pollIntervalMs: number;     // default: 60 * 1000 (1 min)
    maxRecoveryAttempts: number; // default: 3
}

const DEFAULT_OPTIONS: SagaRecoveryWorkerOptions = {
    stuckThresholdMs: 5 * 60 * 1000,
    pollIntervalMs: 60 * 1000,
    maxRecoveryAttempts: 3
};

const PRISMA_SCHEMA_ERROR_CODES = new Set([
    'P2021',
    'P2022'
]);

export class SagaRecoveryWorker {
    private options: SagaRecoveryWorkerOptions;
    private intervalHandle: ReturnType<typeof setInterval> | null = null;
    private recoveryAttempts: Map<string, number> = new Map();

    constructor(
        private readonly sagaLogRepository: ISagaLogRepository,
        private readonly orchestratorRegistry: Map<string, DistributedSagaOrchestrator>,
        options: Partial<SagaRecoveryWorkerOptions> = {}
    ) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    private getOwnedSagaTypes(): string[] {
        return Array.from(this.orchestratorRegistry.keys());
    }

    start(): void {
        if (!isSagaRecoveryEnabled()) {
            console.log('SagaRecoveryWorker disabled via configuration');
            return;
        }

        if (this.getOwnedSagaTypes().length === 0) {
            console.log('SagaRecoveryWorker disabled: no registered saga types');
            return;
        }

        if (this.intervalHandle) {
            console.warn('SagaRecoveryWorker is already running');
            return;
        }

        console.log(`SagaRecoveryWorker started (poll: ${this.options.pollIntervalMs}ms, threshold: ${this.options.stuckThresholdMs}ms)`);

        // Run immediately on start
        void this.runRecoveryCycle('initial recovery');

        this.intervalHandle = setInterval(() => {
            void this.runRecoveryCycle('recovery cycle');
        }, this.options.pollIntervalMs);
    }

    stop(): void {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
            console.log('SagaRecoveryWorker stopped');
        }
    }

    async recover(): Promise<void> {
        const ownedSagaTypes = this.getOwnedSagaTypes();
        if (ownedSagaTypes.length === 0) return;

        const stuckSagas = await this.sagaLogRepository.findStuck(
            [SagaStatus.STARTED, SagaStatus.COMPENSATING],
            this.options.stuckThresholdMs,
            ownedSagaTypes
        );

        if (stuckSagas.length === 0) return;

        console.log(`SagaRecoveryWorker found ${stuckSagas.length} stuck saga(s)`);

        for (const saga of stuckSagas) {
            const attempts = this.recoveryAttempts.get(saga.sagaId) ?? 0;

            if (attempts >= this.options.maxRecoveryAttempts) {
                console.error(`SagaRecoveryWorker: saga ${saga.sagaId} exceeded max recovery attempts (${this.options.maxRecoveryAttempts}), skipping`);
                continue;
            }

            const orchestrator = this.orchestratorRegistry.get(saga.sagaType);
            if (!orchestrator) {
                console.warn(`SagaRecoveryWorker: no orchestrator registered for saga type ${saga.sagaType}, skipping ${saga.sagaId}`);
                continue;
            }

            try {
                console.log(`SagaRecoveryWorker: resuming saga ${saga.sagaId} (type: ${saga.sagaType}, status: ${saga.status}, attempt: ${attempts + 1})`);
                await orchestrator.resume(saga.sagaId);
                // Reset attempts on success
                this.recoveryAttempts.delete(saga.sagaId);
            } catch (error) {
                this.recoveryAttempts.set(saga.sagaId, attempts + 1);
                console.error(`SagaRecoveryWorker: failed to resume saga ${saga.sagaId}:`, error);
            }
        }
    }

    private async runRecoveryCycle(label: 'initial recovery' | 'recovery cycle'): Promise<void> {
        try {
            await this.recover();
        } catch (error) {
            if (this.isSchemaError(error)) {
                this.disablePermanently('SagaRecoveryWorker disabled because the saga schema is missing or out of date. Run database migrations and restart the service.', error);
                return;
            }

            console.error(`SagaRecoveryWorker ${label} failed:`, error);
        }
    }

    private isSchemaError(error: unknown): boolean {
        const name = error instanceof Error ? error.name : '';
        const normalizedName = name.toLowerCase();
        const code = this.getErrorCode(error);

        return (
            normalizedName.includes('prismaclientknownrequesterror')
            && code !== undefined
            && PRISMA_SCHEMA_ERROR_CODES.has(code)
        );
    }

    private disablePermanently(message: string, error: unknown): void {
        console.error(message, error);
        this.stop();
    }

    private getErrorCode(error: unknown): string | undefined {
        if (typeof error !== 'object' || error === null) {
            return undefined;
        }

        const code = (error as { code?: unknown }).code;
        return typeof code === 'string' ? code : undefined;
    }
}
