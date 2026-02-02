import { IWalletRepository } from '../../domain/ports/wallet.repository.port';
import { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';
import { WalletEngine } from '../../domain/engines/wallet.engine';

export interface DebitWalletDTO {
    userId: string;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
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
        private readonly walletEngine: WalletEngine
    ) { }

    async execute(dto: DebitWalletDTO): Promise<DebitWalletResultDTO> {
        const wallet = await this.walletRepository.findByUserId(dto.userId);
        if (!wallet) {
            return {
                success: false,
                message: 'Wallet not found',
            };
        }

        // Validate transaction
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
            id: this.generateId(),
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
            message: 'Wallet debited successfully',
        };
    }

    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
