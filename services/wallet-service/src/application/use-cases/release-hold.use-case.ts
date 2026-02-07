import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { IHoldRepository } from '../../domain/repositories/hold.repository';
import { IdempotencyService } from '../services/idempotency.service';
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';

export interface ReleaseHoldDTO {
    holdId: string;
    userId: string; // For ownership check
    reason: string;
    idempotencyKey: string;
    auditInfo: AuditInfo;
}

export class ReleaseHoldUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly holdRepository: IHoldRepository,
        private readonly idempotencyService: IdempotencyService,
        private readonly eventPublisher: WalletEventPublisher
    ) { }

    async execute(dto: ReleaseHoldDTO): Promise<void> {
        const idempotencyKey = IdempotencyKey.create(dto.idempotencyKey);

        const cached = await this.idempotencyService.checkIdempotency(idempotencyKey);
        if (cached) return;

        const hold = await this.holdRepository.findById(dto.holdId);
        if (!hold) {
            throw new Error('Hold not found');
        }

        const wallet = await this.walletRepository.findById(hold.walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        if (wallet.userId !== dto.userId) {
            throw new Error('Unauthorized to release this hold');
        }

        // Domain logic
        wallet.releaseHold(hold);

        // Persist
        await this.walletRepository.update(wallet);
        await this.holdRepository.update(hold);

        await this.idempotencyService.storeResult(idempotencyKey, { released: true });

        // Publish Event
        await this.eventPublisher.publishHoldReleased({
            holdId: hold.id,
            walletId: wallet.id,
            userId: dto.userId,
            reason: dto.reason,
            timestamp: new Date()
        });
    }
}
