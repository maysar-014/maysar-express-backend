
import { Wallet } from '@wallet/domain/entities/wallet.entity';
import { Transaction } from '@wallet/domain/entities/transaction.entity';
import { WalletResponseDto, TransactionResponseDto } from '../dtos/wallet.dto';

export class WalletMapper {
    static toDto(wallet: Wallet): WalletResponseDto {
        return {
            id: wallet.id,
            userId: wallet.userId,
            balance: wallet.balance,
            currency: wallet.currency,
            status: wallet.status,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt
        };
    }

    static toTransactionDto(transaction: Transaction): TransactionResponseDto {
        return {
            id: transaction.id,
            walletId: transaction.walletId,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            balanceAfter: transaction.balanceAfter,
            createdAt: transaction.createdAt
        };
    }
}
