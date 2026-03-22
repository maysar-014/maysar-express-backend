import { Prisma, PrismaClient, Wallet_Transaction, Wallet_TransactionType } from '@prisma/client';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionType } from '../../domain/entities/transaction.entity';
import { ActorType } from '../../domain/value-objects/audit-info.value-object';

export class TransactionRepository implements ITransactionRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(transaction: Transaction): Promise<void> {
        const data = {
            id: transaction.id,
            walletId: transaction.walletId,
            userId: transaction.userId,
            type: this.toPrismaTransactionType(transaction.type),
            amount: transaction.amount,
            currency: transaction.currency,
            balanceBefore: transaction.balanceBefore,
            balanceAfter: transaction.balanceAfter,
            frozenAmountBefore: transaction.frozenAmountBefore,
            frozenAmountAfter: transaction.frozenAmountAfter,
            description: transaction.description,
            metadata: (transaction.metadata || {}) as Prisma.InputJsonValue,
            createdAt: transaction.createdAt,
            correlationId: transaction.correlationId,
            idempotencyKey: transaction.idempotencyKey,
            initiatedBy: transaction.initiatedBy,
            initiatedByType: transaction.initiatedByType,
            reason: transaction.reason,
            isReversed: transaction.isReversed,
            reversalTransactionId: transaction.reversalTransactionId,
            expiresAt: transaction.expiresAt,
            isCODRelated: transaction.isCODRelated,
            codOrderId: transaction.codOrderId,
            codConfirmationRequired: transaction.codConfirmationRequired,
            codConfirmedAt: transaction.codConfirmedAt
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

    private toDomain(record: Wallet_Transaction): Transaction {
        const description = record.description || 'Legacy wallet transaction';
        const correlationId = record.correlationId || `legacy-${record.id}`;
        const initiatedBy = record.initiatedBy || record.userId || 'system';
        const reason = record.reason || record.description || record.type || 'LEGACY_TRANSACTION';

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
            description,
            metadata: (record.metadata as Record<string, unknown>) || undefined,
            createdAt: record.createdAt,
            correlationId,
            idempotencyKey: record.idempotencyKey || undefined,
            initiatedBy,
            initiatedByType: this.toActorType(record.initiatedByType),
            reason,
            isReversed: record.isReversed,
            reversalTransactionId: record.reversalTransactionId || undefined,
            expiresAt: record.expiresAt || undefined,
            referenceType: record.referenceType || undefined,
            referenceId: record.referenceId || undefined,
            isCODRelated: record.isCODRelated,
            codOrderId: record.codOrderId || undefined,
            codConfirmationRequired: record.codConfirmationRequired ?? false,
            codConfirmedAt: record.codConfirmedAt || undefined
        });
    }

    private toActorType(value: string | null): ActorType {
        return value && Object.values(ActorType).includes(value as ActorType)
            ? (value as ActorType)
            : ActorType.SYSTEM;
    }

    private toPrismaTransactionType(type: TransactionType): Wallet_TransactionType {
        return type as Wallet_TransactionType;
    }
}
