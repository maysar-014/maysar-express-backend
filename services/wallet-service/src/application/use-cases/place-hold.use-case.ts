import { Money } from '../../domain/value-objects/money.value-object';
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { IHoldRepository } from '../../domain/repositories/hold.repository';
// Wait, I deleted interfaces, but I haven't moved hold repository interface yet!
// I need to create hold repository in repositories folder first!
import { IdempotencyService } from '../services/idempotency.service';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';

export interface PlaceHoldDTO {
    userId: string;
    amount: number;
    currency: string;
    reason: string;
    /**
     * Machine-readable reference to the business entity the hold secures
     * (e.g. an order id), plus its type.
     *
     * Holds previously carried the business context only inside the free-text
     * `reason` ("COD Delivery Fee for Order ORD-..."). That made the hold
     * impossible to reconcile programmatically: a safety net that has to
     * pattern-match prose cannot be trusted with returning customer money, and
     * it is why a release failure left funds frozen with no recovery path.
     */
    referenceId?: string;
    referenceType?: string;
    metadata?: Record<string, unknown>;
    expiresInSeconds: number;
    idempotencyKey: string;
    auditInfo: AuditInfo;
}

export interface PlaceHoldResult {
    holdId: string;
    expiresAt: Date;
}

export class PlaceHoldUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly holdRepository: IHoldRepository,
        private readonly idempotencyService: IdempotencyService,
        private readonly eventPublisher: WalletEventPublisher
    ) { }

    async execute(dto: PlaceHoldDTO): Promise<PlaceHoldResult> {
        const idempotencyKey = IdempotencyKey.create(dto.idempotencyKey);

        // 1. Check Idempotency
        const cachedResult = await this.idempotencyService.checkIdempotency<PlaceHoldResult>(idempotencyKey);
        if (cachedResult) {
            return cachedResult;
        }

        // 2. Get Wallet
        const wallet = await this.walletRepository.findByUserId(dto.userId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        // 3. Create Hold
        const amount = Money.fromMinor(dto.amount, dto.currency);
        const expiresAt = new Date(Date.now() + dto.expiresInSeconds * 1000);

        const hold = wallet.placeHold(
            amount,
            expiresAt,
            dto.reason,
            dto.referenceId || dto.referenceType
                ? {
                    ...(dto.referenceId ? { referenceId: dto.referenceId } : {}),
                    ...(dto.referenceType ? { referenceType: dto.referenceType } : {}),
                    ...(dto.metadata as Record<string, unknown> | undefined),
                }
                : (dto.metadata as Record<string, unknown> | undefined)
        );

        // 4. Persist
        // Transactionally save wallet (updated frozen amount) and hold
        // Ideally this should be a UnitOfWork, but for now individual saves 
        // (Note: In real implementation, wrap in transaction)
        await this.walletRepository.update(wallet);
        await this.holdRepository.save(hold);

        const result: PlaceHoldResult = {
            holdId: hold.id,
            expiresAt: hold.expiresAt
        };

        // 5. Store Idempotency Result
        await this.idempotencyService.storeResult(idempotencyKey, result);

        // Publish Event
        await this.eventPublisher.publishHoldPlaced({
            holdId: hold.id,
            walletId: wallet.id,
            userId: dto.userId,
            amount: dto.amount,
            reason: dto.reason,
            expiresAt: hold.expiresAt,
            timestamp: new Date()
        });

        return result;
    }
}
