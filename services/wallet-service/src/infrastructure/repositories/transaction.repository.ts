import { PrismaClient } from '@prisma/client';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';
import { Transaction, TransactionType, TransactionProps } from '../../domain/entities/transaction.entity';

export class TransactionRepository implements ITransactionRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(transaction: Transaction): Promise<void> {
        const data = transaction.toObject();

        await this.prisma.transaction.create({
            data: {
                id: data.id,
                walletId: data.walletId,
                paymentId: data.paymentId,
                userId: data.userId,
                type: data.type as any, // Map to Prisma enum
                amount: data.amount,
                currency: data.currency,
                balanceBefore: data.balanceBefore,
                balanceAfter: data.balanceAfter,
                frozenAmountBefore: data.frozenAmountBefore,
                frozenAmountAfter: data.frozenAmountAfter,
                referenceType: data.referenceType,
                referenceId: data.referenceId,
                description: data.description,
                metadata: data.metadata as any, // Prisma Json type
                createdAt: data.createdAt,
            }
        });
    }

    async findById(id: string): Promise<Transaction | null> {
        const data = await this.prisma.transaction.findUnique({
            where: { id }
        });

        if (!data) return null;

        return this.mapToEntity(data);
    }

    async findByWalletId(walletId: string, limit: number = 20, offset: number = 0): Promise<Transaction[]> {
        const data = await this.prisma.transaction.findMany({
            where: { walletId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        return data.map((item: any) => this.mapToEntity(item));
    }

    async findByPaymentId(paymentId: string): Promise<Transaction[]> {
        const data = await this.prisma.transaction.findMany({
            where: { paymentId },
            orderBy: { createdAt: 'desc' }
        });

        return data.map((item: any) => this.mapToEntity(item));
    }

    private mapToEntity(data: any): Transaction {
        return new Transaction({
            id: data.id,
            walletId: data.walletId,
            paymentId: data.paymentId,
            userId: data.userId,
            type: data.type as TransactionType,
            amount: Number(data.amount), // Decimal to Number
            currency: data.currency,
            balanceBefore: Number(data.balanceBefore),
            balanceAfter: Number(data.balanceAfter),
            frozenAmountBefore: Number(data.frozenAmountBefore),
            frozenAmountAfter: Number(data.frozenAmountAfter),
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            description: data.description,
            metadata: data.metadata as any,
            createdAt: data.createdAt,
        });
    }
}
