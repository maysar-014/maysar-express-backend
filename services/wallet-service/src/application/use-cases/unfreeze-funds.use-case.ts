import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';

import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface UnfreezeFundsDTO {
    userId: string;
    amount: number;
    description: string;
    reason?: string;
    correlationId: string;
    auditInfo: AuditInfo;
    metadata?: Record<string, unknown>;
}

export interface UnfreezeFundsResultDTO {
    success: boolean;
    walletId?: string;
    transactionId?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    message?: string;
}

export class UnfreezeFundsUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly transactionRepository: ITransactionRepository
    ) { }

    async execute(dto: UnfreezeFundsDTO): Promise<UnfreezeFundsResultDTO> {
        const wallet = await this.walletRepository.findByUserId(dto.userId);
        if (!wallet) {
            return {
                success: false,
                message: 'Wallet not found',
            };
        }

        const balanceBefore = wallet.balance;
        const frozenBefore = wallet.frozenAmount;

        try {
            wallet.unfreeze(dto.amount);
            await this.walletRepository.update(wallet);

            // Record transaction
            const transaction = new Transaction({
                id: this.generateId(),
                walletId: wallet.id,
                userId: dto.userId,
                type: TransactionType.UNFREEZE,
                amount: dto.amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                frozenAmountBefore: frozenBefore,
                frozenAmountAfter: wallet.frozenAmount,
                description: dto.description,
                metadata: dto.metadata,
                createdAt: new Date(),
                correlationId: dto.correlationId,
                initiatedBy: dto.auditInfo.actor,
                initiatedByType: dto.auditInfo.actorType,
                reason: dto.reason || 'FUNDS_UNFREEZE',
                isReversed: false,
                isCODRelated: false,
                codConfirmationRequired: false
            });

            await this.transactionRepository.save(transaction);

            return {
                success: true,
                walletId: wallet.id,
                transactionId: transaction.id,
                balanceBefore,
                balanceAfter: wallet.balance,
                message: 'Funds unfrozen successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to unfreeze funds',
            };
        }
    }

    private generateId(): string {
        return makeId(getModelPrefix('Wallet_Transaction'));
    }
}
