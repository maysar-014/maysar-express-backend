import { ISagaLogRepository, SagaStatus } from './saga.log';
import { DistributedSagaOrchestrator } from './saga.orchestrator';

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

    start(): void {
        if (this.intervalHandle) {
            console.warn('SagaRecoveryWorker is already running');
            return;
        }

        console.log(`SagaRecoveryWorker started (poll: ${this.options.pollIntervalMs}ms, threshold: ${this.options.stuckThresholdMs}ms)`);

        // Run immediately on start
        this.recover().catch(err => {
            console.error('SagaRecoveryWorker initial recovery failed:', err);
        });

        this.intervalHandle = setInterval(() => {
            this.recover().catch(err => {
                console.error('SagaRecoveryWorker recovery cycle failed:', err);
            });
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
        const stuckSagas = await this.sagaLogRepository.findStuck(
            [SagaStatus.STARTED, SagaStatus.COMPENSATING],
            this.options.stuckThresholdMs
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
}
