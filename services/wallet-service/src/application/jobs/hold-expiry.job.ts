import { ExpireHoldUseCase } from '../use-cases/expire-hold.use-case';
import { IHoldRepository } from '../../domain/repositories/hold.repository';

export class HoldExpiryJob {
    private isRunning = false;

    constructor(
        private readonly holdRepository: IHoldRepository,
        private readonly expireHoldUseCase: ExpireHoldUseCase
    ) { }

    async start(): Promise<void> {
        // This could be triggered by a scheduler
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
