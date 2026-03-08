import { randomUUID } from 'crypto';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { IHoldRepository } from '../../domain/repositories/hold.repository';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { IdempotencyService } from '../services/idempotency.service';
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';

export interface CaptureHoldDTO {
    holdId: string;
    userId: string;
    amount?: number; // Optional partial capture, defaulting to full for now
    reason: string;
    idempotencyKey: string;
    correlationId: string;
    auditInfo: AuditInfo;
}

export class CaptureHoldUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly holdRepository: IHoldRepository,
        private readonly transactionRepository: ITransactionRepository,
        private readonly idempotencyService: IdempotencyService,
        private readonly eventPublisher: WalletEventPublisher
    ) { }

    async execute(dto: CaptureHoldDTO): Promise<{ captured: boolean; transactionId: string }> {
        const idempotencyKey = IdempotencyKey.create(dto.idempotencyKey);

        const cached = await this.idempotencyService.checkIdempotency<{ captured: boolean; transactionId: string }>(idempotencyKey);
        if (cached) return cached;

        const hold = await this.holdRepository.findById(dto.holdId);
        if (!hold) {
            throw new Error('Hold not found');
        }

        const wallet = await this.walletRepository.findById(hold.walletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        // Domain logic
        wallet.captureHold(hold);

        // Create Transaction Record
        const transaction = new Transaction({
            id: randomUUID(),
            walletId: wallet.id,
            userId: wallet.userId,
            type: TransactionType.DEBIT_FROZEN,
            amount: hold.amount.amount,
            currency: hold.amount.currency,
            balanceBefore: wallet.balance + hold.amount.amount, // Reversing calculation for "before" state
            balanceAfter: wallet.balance,
            frozenAmountBefore: wallet.frozenAmount + hold.amount.amount,
            frozenAmountAfter: wallet.frozenAmount,
            description: dto.reason,
            createdAt: new Date(),
            correlationId: dto.correlationId,
            initiatedBy: dto.auditInfo.actor,
            initiatedByType: dto.auditInfo.actorType,
            reason: dto.reason,
            isReversed: false,
            isCODRelated: false,
            codConfirmationRequired: false,
            metadata: {
                holdId: hold.id,
                ...dto.auditInfo.metadata
            }
        });

        // Persist
        await this.walletRepository.update(wallet);
        await this.holdRepository.update(hold);
        await this.transactionRepository.save(transaction);

        const result = { captured: true, transactionId: transaction.id };
        // Store result
        await this.idempotencyService.storeResult(idempotencyKey, result);

        // Publish Event
        await this.eventPublisher.publishHoldCaptured({
            holdId: hold.id,
            walletId: wallet.id,
            userId: dto.userId,
            transactionId: transaction.id,
            amount: transaction.amount,
            timestamp: new Date()
        });

        return result;
    }
}
