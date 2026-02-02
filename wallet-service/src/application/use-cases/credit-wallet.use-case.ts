import { Wallet, WalletStatus } from '../../domain/entities/wallet.entity';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';
import { IWalletRepository } from '../../domain/ports/wallet.repository.port';
import { ITransactionRepository } from '../../domain/ports/transaction.repository.port';

export interface CreditWalletDTO {
    userId: string;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
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
        private readonly transactionRepository: ITransactionRepository
    ) { }

    async execute(dto: CreditWalletDTO): Promise<CreditWalletResultDTO> {
        // Find or create wallet
        let wallet = await this.walletRepository.findByUserId(dto.userId);
        if (!wallet) {
            wallet = new Wallet({
                id: this.generateId(),
                userId: dto.userId,
                balance: 0,
                currency: 'TZS',
                status: WalletStatus.ACTIVE,
                frozenAmount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
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
            id: this.generateId(),
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
            message: 'Wallet credited successfully',
        };
    }

    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
