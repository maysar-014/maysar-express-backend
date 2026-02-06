import { Transaction } from '../entities/transaction.entity';

export interface ITransactionRepository {
    save(transaction: Transaction): Promise<void>;
    findById(id: string): Promise<Transaction | null>;
    findByWalletId(walletId: string, limit?: number, offset?: number): Promise<Transaction[]>;
    findByPaymentId(paymentId: string): Promise<Transaction[]>;
}
