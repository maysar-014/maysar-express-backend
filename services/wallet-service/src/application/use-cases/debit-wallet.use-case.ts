import { randomUUID } from 'crypto';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';
import { WalletEngine } from '../../domain/engines/wallet.engine';
import { LimitPolicy } from '../../domain/policies/wallet-limit.policy';
import { VelocityCheckService } from '../services/velocity-check.service';
import { IdempotencyService } from '../services/idempotency.service';
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key.value-object';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';
import { IAuditLogRepository } from '../../infrastructure/repositories/audit-log.repository';
import { RedisLock } from '../../../../../shared/locking/redis-lock';

export interface DebitWalletDTO {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, unknown>;
    idempotencyKey: string;
    correlationId: string;
    auditInfo: AuditInfo;
}

export interface DebitWalletResultDTO {
    success: boolean;
    walletId?: string;
    transactionId?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    message?: string;
}

export class DebitWalletUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly transactionRepository: ITransactionRepository,
        private readonly walletEngine: WalletEngine,
        private readonly limitPolicy: LimitPolicy,
        private readonly velocityCheckService: VelocityCheckService,
        private readonly idempotencyService: IdempotencyService,
        private readonly eventPublisher: WalletEventPublisher,
        private readonly auditLogRepository: IAuditLogRepository,
        private readonly redisLock: RedisLock
    ) { }

    async execute(dto: DebitWalletDTO): Promise<DebitWalletResultDTO> {
        const idempotencyKey = IdempotencyKey.create(dto.idempotencyKey);

        // 1. Idempotency
        const cached = await this.idempotencyService.checkIdempotency<DebitWalletResultDTO>(idempotencyKey);
        if (cached) return cached;

        return this.redisLock.withLock(`wallet:${dto.userId}`, async () => {
            const wallet = await this.walletRepository.findByUserId(dto.userId);
            if (!wallet) {
                return {
                    success: false,
                    message: 'Wallet not found',
                };
            }

            const debitAmount = Money.fromMinor(dto.amount, dto.currency);

            // 2. Policy Checks (Limits)
            const recentTransactions = await this.transactionRepository.findByUserId(dto.userId, { limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });

            // Calculate daily stats in-memory for now
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const todayTxs = recentTransactions.filter(t => t.createdAt >= startOfDay && t.type === TransactionType.DEBIT);
            const dailyCount = todayTxs.length;
            const dailyTotal = todayTxs.reduce((sum, t) => sum + t.amount, 0);
            const monthlyTotal = 0; // Placeholder

            const limitResult = this.limitPolicy.canDebit(
                debitAmount,
                Money.fromMinor(wallet.balance, wallet.currency),
                Money.fromMinor(wallet.frozenAmount, wallet.currency),
                dailyCount,
                Money.fromMinor(dailyTotal, dto.currency),
                Money.fromMinor(monthlyTotal, dto.currency)
            );

            if (!limitResult.allowed) {
                return {
                    success: false,
                    message: `Limit exceeded: ${limitResult.reason}`
                };
            }

            // 3. Velocity Check
            const velocityResult = await this.velocityCheckService.checkVelocity(dto.userId, debitAmount);
            if (velocityResult.decision === 'BLOCK') {
                return {
                    success: false,
                    message: `Transaction blocked by fraud check: ${velocityResult.reason}`
                };
            }

            // 4. Engine Validation (Balance check)
            const validation = this.walletEngine.validateTransaction(
                wallet.balance,
                wallet.frozenAmount,
                dto.amount
            );

            if (!validation.isValid) {
                return {
                    success: false,
                    message: validation.errors.join(', '),
                };
            }

            const balanceBefore = wallet.balance;
            const frozenBefore = wallet.frozenAmount;

            // Debit wallet
            wallet.debit(dto.amount);
            await this.walletRepository.update(wallet);

            // Record transaction
            const transaction = new Transaction({
                id: randomUUID(),
                walletId: wallet.id,
                userId: dto.userId,
                type: TransactionType.DEBIT,
                amount: dto.amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                frozenAmountBefore: frozenBefore,
                frozenAmountAfter: wallet.frozenAmount,
                description: dto.description,
                metadata: {
                    ...dto.metadata,
                    velocityRiskScore: velocityResult.riskScore,
                    velocityReason: velocityResult.reason
                },
                createdAt: new Date(),
                // Enhanced Fields
                correlationId: dto.correlationId,
                idempotencyKey: idempotencyKey.toString(),
                initiatedBy: dto.auditInfo.actor,
                initiatedByType: dto.auditInfo.actorType,
                reason: `DEBIT_REQUEST: ${dto.description}`,
                isReversed: false,
                isCODRelated: false,
                codConfirmationRequired: false
            });

            await this.transactionRepository.save(transaction);

            const result: DebitWalletResultDTO = {
                success: true,
                walletId: wallet.id,
                transactionId: transaction.id,
                balanceBefore,
                balanceAfter: wallet.balance,
                message: 'Wallet debited successfully',
            };

            // Store Idempotency
            await this.idempotencyService.storeResult(idempotencyKey, result);

            // Publish Event
            await this.eventPublisher.publishWalletDebited({
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
                `DEBIT_WALLET: ${dto.amount} ${dto.currency}`
            );

            return result;
        });
    }
}
