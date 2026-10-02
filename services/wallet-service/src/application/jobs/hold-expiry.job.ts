import { ExpireHoldUseCase } from '../use-cases/expire-hold.use-case';
import { IHoldRepository } from '../../domain/repositories/hold.repository';

export class HoldExpiryJob {
    private isRunning = false;

    constructor(
        private readonly holdRepository: IHoldRepository,
        private readonly expireHoldUseCase: ExpireHoldUseCase
    ) { }

    private timer: ReturnType<typeof setInterval> | null = null;

    /**
     * Starts recurring expiry.
     *
     * This job used to expose only `start()`, which ran the sweep exactly once
     * — and it was never invoked at all, so expired holds were never reclaimed.
     * `start()` is kept for compatibility and simply schedules the sweep.
     */
    start(intervalMs: number = 60_000): void {
        if (this.timer) return;
        void this.runSweep();
        this.timer = setInterval(() => {
            void this.runSweep();
        }, intervalMs);
        this.timer.unref?.();
        console.log(`[HoldExpiryJob] started (interval ${intervalMs}ms)`);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('[HoldExpiryJob] stopped');
        }
    }

    /** Runs a single sweep. Exposed for tests and manual invocation. */
    async runSweep(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;
        try {
            await this.processExpiredHolds();
        } finally {
            this.isRunning = false;
        }
    }

    private async processExpiredHolds(): Promise<void> {
        const batchSize = 100;
        const expiredHolds = await this.holdRepository.findExpired(batchSize); // findExpired implementation must check now() > expiresAt

        for (const hold of expiredHolds) {
            try {
                await this.expireHoldUseCase.execute(hold.id);
                console.log(`Expired hold ${hold.id}`);
            } catch (error) {
                console.error(`Failed to expire hold ${hold.id}`, error);
            }
        }
    }
}
