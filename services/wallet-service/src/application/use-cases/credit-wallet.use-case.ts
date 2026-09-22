import { Wallet, WalletStatus } from '../../domain/entities/wallet.entity';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';
import { IdempotencyService } from '../services/idempotency.service';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';
import { IAuditLogRepository } from '../../infrastructure/repositories/audit-log.repository';
import { RedisLock } from '../../../../../shared/locking/redis-lock';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface CreditWalletDTO {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, unknown>;
    /** Optional source reference for the credit (e.g. 'topup', 'refund'). */
    referenceType?: string;
    /** Optional id of the referenced source entity (e.g. payment/order id). */
    referenceId?: string;
    idempotencyKey: string;
    correlationId: string;
    auditInfo: AuditInfo;
}

export interface CreditWalletResultDTO {
    success: boolean;
    walletId?: string;
    transactionId?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    message?: string;
}

export class CreditWalletUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly transactionRepository: ITransactionRepository,
        private readonly idempotencyService: IdempotencyService,
        private readonly eventPublisher: WalletEventPublisher,
        private readonly auditLogRepository: IAuditLogRepository,
        private readonly redisLock: RedisLock
    ) { }

    async execute(dto: CreditWalletDTO): Promise<CreditWalletResultDTO> {
        const idempotencyKey = IdempotencyKey.create(dto.idempotencyKey);

        // 1. Idempotency Check
        const cached = await this.idempotencyService.checkIdempotency<CreditWalletResultDTO>(idempotencyKey);
        if (cached) return cached;

        return this.redisLock.withLock(`wallet:${dto.userId}`, async () => {
            // Find or create wallet
            let wallet = await this.walletRepository.findByUserId(dto.userId);
            if (!wallet) {
                wallet = new Wallet({
                    id: makeId(getModelPrefix('Wallet_Wallet')),
                    userId: dto.userId,
                    balance: 0,
                    currency: dto.currency || 'TZS',
                    status: WalletStatus.ACTIVE,
                    frozenAmount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    codCommitmentLimit: 0,
                    codCommitmentUsed: 0,
                    codCommitmentCount: 0,
                    version: 0,
                });
                await this.walletRepository.save(wallet);
            }

            const balanceBefore = wallet.balance;
            const frozenBefore = wallet.frozenAmount;

            // Credit wallet
            wallet.credit(dto.amount);
            await this.walletRepository.update(wallet);

            // Record transaction
            const transaction = new Transaction({
                id: makeId(getModelPrefix('Wallet_Transaction')),
                walletId: wallet.id,
                userId: dto.userId,
                type: TransactionType.CREDIT,
                amount: dto.amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                frozenAmountBefore: frozenBefore,
                frozenAmountAfter: wallet.frozenAmount,
                description: dto.description,
                metadata: dto.referenceType || dto.referenceId
                    ? {
                        ...(dto.metadata ?? {}),
                        ...(dto.referenceType ? { referenceType: dto.referenceType } : {}),
                        ...(dto.referenceId ? { referenceId: dto.referenceId } : {})
                    }
                    : dto.metadata,
                createdAt: new Date(),
                // Enhanced Fields
                correlationId: dto.correlationId,
                idempotencyKey: idempotencyKey.toString(),
                initiatedBy: dto.auditInfo.actor,
                initiatedByType: dto.auditInfo.actorType,
                reason: `CREDIT_REQUEST: ${dto.description}`,
                isReversed: false,
                isCODRelated: false,
                codConfirmationRequired: false
            });

            await this.transactionRepository.save(transaction);

            const result: CreditWalletResultDTO = {
                success: true,
                walletId: wallet.id,
                transactionId: transaction.id,
                balanceBefore,
                balanceAfter: wallet.balance,
                message: 'Wallet credited successfully',
            };

            // Store Idempotency
            await this.idempotencyService.storeResult(idempotencyKey, result);

            // Publish Event
            await this.eventPublisher.publishWalletCredited({
                walletId: wallet.id,
                userId: dto.userId,
                amount: dto.amount,
                currency: dto.currency,
                transactionId: transaction.id,
                balanceAfter: wallet.balance,
                timestamp: new Date()
            });

            // Audit Log
            await this.auditLogRepository.save(
                dto.auditInfo,
                wallet.id,
                'WALLET',
                `CREDIT_WALLET: ${dto.amount} ${dto.currency}`
            );

            return result;
        });
    }
}
