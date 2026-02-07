import { Transaction } from '../entities/transaction.entity';

export interface ITransactionRepository {
    save(transaction: Transaction): Promise<void>;
    findById(id: string): Promise<Transaction | null>;
    findByWalletId(walletId: string, limit?: number, offset?: number): Promise<Transaction[]>;
    findByPaymentId(paymentId: string): Promise<Transaction[]>;

    // New methods
    findByIdempotencyKey(key: string): Promise<Transaction | null>;
    findByCorrelationId(correlationId: string): Promise<Transaction[]>;
    findByUserId(userId: string, options?: { limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<Transaction[]>;
    findByReference(referenceType: string, referenceId: string): Promise<Transaction[]>;
}
