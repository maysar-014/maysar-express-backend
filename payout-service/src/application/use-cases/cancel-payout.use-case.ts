import { IPayoutRepository } from '../../domain/ports/payout.repository.port';

export class CancelPayoutUseCase {
    constructor(private readonly payoutRepository: IPayoutRepository) { }

    async execute(payoutId: string, reason: string): Promise<void> {
        const payout = await this.payoutRepository.findById(payoutId);
        if (!payout) {
            throw new Error('Payout not found');
        }

        payout.cancel();
        // failureReason is private in Payout entity but can be set via fail()
        // but cancel() specifically sets status to CANCELLED
        await this.payoutRepository.update(payout);
    }
}
