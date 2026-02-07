import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { IHoldRepository } from '../../domain/repositories/hold.repository';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';

export class ExpireHoldUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly holdRepository: IHoldRepository,
        private readonly eventPublisher: WalletEventPublisher
    ) { }

    async execute(holdId: string): Promise<void> {
        const hold = await this.holdRepository.findById(holdId);
        if (!hold) {
            // Already gone or never existed
            return;
        }

        if (hold.status !== 'ACTIVE') {
            // Already processed
            return;
        }

        const wallet = await this.walletRepository.findById(hold.walletId);
        if (!wallet) {
            throw new Error(`Wallet ${hold.walletId} not found for hold ${holdId}`);
        }

        // Domain logic
        wallet.expireHold(hold);

        // Persist
        await this.walletRepository.update(wallet);
        await this.holdRepository.update(hold);

        // Publish Event
        await this.eventPublisher.publishHoldExpired({
            holdId: hold.id,
            walletId: wallet.id,
            timestamp: new Date()
        });
    }
}
