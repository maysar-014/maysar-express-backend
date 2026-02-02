import { PayoutStatus } from '../../domain/entities/payout.entity';
import { IPayoutRepository } from '../../domain/ports/payout.repository.port';

export class CompletePayoutUseCase {
    constructor(private readonly payoutRepository: IPayoutRepository) { }

    async execute(payoutId: string, providerPayoutId?: string): Promise<void> {
        const payout = await this.payoutRepository.findById(payoutId);
        if (!payout) {
            throw new Error('Payout not found');
        }

        payout.complete(providerPayoutId);
        await this.payoutRepository.update(payout);
    }
}
