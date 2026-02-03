import { IWalletRepository } from '../../domain/ports/wallet.repository.port';
import { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';

export interface FreezeFundsDTO {
    userId: string;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
}

export interface FreezeFundsResultDTO {
    success: boolean;
    walletId?: string;
    transactionId?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    message?: string;
}

export class FreezeFundsUseCase {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly transactionRepository: ITransactionRepository
    ) { }

    async execute(dto: FreezeFundsDTO): Promise<FreezeFundsResultDTO> {
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
            wallet.freeze(dto.amount);
            await this.walletRepository.update(wallet);

            // Record transaction
            const transaction = new Transaction({
                id: this.generateId(),
                walletId: wallet.id,
                userId: dto.userId,
                type: TransactionType.FREEZE,
                amount: dto.amount,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                frozenAmountBefore: frozenBefore,
                frozenAmountAfter: wallet.frozenAmount,
                description: dto.description,
                metadata: dto.metadata,
                createdAt: new Date(),
            });

            await this.transactionRepository.save(transaction);

            return {
                success: true,
                walletId: wallet.id,
                transactionId: transaction.id,
                balanceBefore,
                balanceAfter: wallet.balance,
                message: 'Funds frozen successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to freeze funds',
            };
        }
    }

    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
