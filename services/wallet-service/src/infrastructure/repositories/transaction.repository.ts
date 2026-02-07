import { PrismaClient } from '@prisma/client';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionProps, TransactionType } from '../../domain/entities/transaction.entity';

export class TransactionRepository implements ITransactionRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(transaction: Transaction): Promise<void> {
        const data: any = {
            id: transaction.id,
            walletId: transaction.walletId,
            userId: transaction.userId,
            type: transaction.type, // Map enum if needed
            amount: transaction.amount,
            currency: transaction.currency,
            balanceBefore: transaction.balanceBefore,
            balanceAfter: transaction.balanceAfter,
            frozenAmountBefore: transaction.frozenAmountBefore,
            frozenAmountAfter: transaction.frozenAmountAfter,
            description: transaction.description,
            metadata: transaction.metadata || {},
            createdAt: transaction.createdAt,
            // Enhanced fields
            correlationId: transaction.correlationId,
            idempotencyKey: transaction.idempotencyKey,
            initiatedBy: transaction.initiatedBy,
            initiatedByType: transaction.initiatedByType,
            reason: transaction.reason,
            isReversed: transaction.isReversed,
            reversalTransactionId: transaction.reversalTransactionId,
            expiresAt: transaction.expiresAt
        };

        await this.prisma.wallet_Transaction.create({
            data
        });
    }

    async findById(id: string): Promise<Transaction | null> {
        const record = await this.prisma.wallet_Transaction.findUnique({
            where: { id }
        });
        return record ? this.toDomain(record) : null;
    }

    async findByWalletId(walletId: string, limit?: number, offset?: number): Promise<Transaction[]> {
        const records = await this.prisma.wallet_Transaction.findMany({
            where: { walletId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        return records.map(r => this.toDomain(r));
    }

    async findByIdempotencyKey(key: string): Promise<Transaction | null> {
        const record = await this.prisma.wallet_Transaction.findUnique({
            where: { idempotencyKey: key }
        });
        return record ? this.toDomain(record) : null;
    }

    async findByCorrelationId(correlationId: string): Promise<Transaction[]> {
        const records = await this.prisma.wallet_Transaction.findMany({
            where: { correlationId },
            orderBy: { createdAt: 'desc' }
        });
        return records.map(r => this.toDomain(r));
    }

    async findByUserId(userId: string, options?: { limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<Transaction[]> {
        const records = await this.prisma.wallet_Transaction.findMany({
            where: { userId },
            orderBy: { [options?.sortBy || 'createdAt']: options?.sortOrder || 'desc' },
            take: options?.limit
        });
        return records.map(r => this.toDomain(r));
    }

    async findByReference(referenceType: string, referenceId: string): Promise<Transaction[]> {
        const records = await this.prisma.wallet_Transaction.findMany({
            where: { referenceType, referenceId },
            orderBy: { createdAt: 'desc' }
        });
        return records.map(r => this.toDomain(r));
    }

    // Legacy method support if needed
    async findByPaymentId(paymentId: string): Promise<Transaction[]> {
        // Assuming paymentId is stored in referenceId with type 'PAYMENT'
        return this.findByReference('PAYMENT', paymentId);
    }

    private toDomain(record: any): Transaction {
        return new Transaction({
            id: record.id,
            walletId: record.walletId,
            userId: record.userId,
            type: record.type as TransactionType,
            amount: Number(record.amount),
            currency: record.currency,
            balanceBefore: Number(record.balanceBefore),
            balanceAfter: Number(record.balanceAfter),
            frozenAmountBefore: Number(record.frozenAmountBefore),
            frozenAmountAfter: Number(record.frozenAmountAfter),
            description: record.description,
            metadata: record.metadata,
            createdAt: record.createdAt,
            correlationId: record.correlationId,
            idempotencyKey: record.idempotencyKey,
            initiatedBy: record.initiatedBy,
            initiatedByType: record.initiatedByType,
            reason: record.reason,
            isReversed: record.isReversed,
            reversalTransactionId: record.reversalTransactionId,
            expiresAt: record.expiresAt
        });
    }
}
