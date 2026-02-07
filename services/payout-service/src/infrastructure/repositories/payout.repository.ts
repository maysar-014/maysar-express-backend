import { PrismaClient } from '@prisma/client';
import { IPayoutRepository } from '../../domain/ports/payout.repository.port';
import { Payout, PayoutStatus, PayoutMethod } from '../../domain/entities/payout.entity';

export class PayoutRepository implements IPayoutRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(payout: Payout): Promise<void> {
        const data = payout.toObject();

        await this.prisma.payout.create({
            data: {
                id: data.id,
                userId: data.userId,
                userRole: data.userRole,
                amount: data.amount,
                currency: data.currency,
                method: data.method as any,
                status: data.status as any,
                bankDetails: data.bankDetails as any,
                mobileMoneyDetails: data.mobileMoneyDetails as any,
                reference: data.reference,
                processedAt: data.processedAt,
                completedAt: data.completedAt,
                failedAt: data.failedAt,
                failureReason: data.failureReason,
                fee: data.fee,
                netAmount: data.netAmount,
                metadata: data.metadata as any,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }
        });
    }

    async findById(id: string): Promise<Payout | null> {
        const data = await this.prisma.payout.findUnique({
            where: { id }
        });

        if (!data) return null;

        return this.mapToEntity(data);
    }

    async findByUserId(userId: string, limit: number = 20): Promise<Payout[]> {
        const data = await this.prisma.payout.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return data.map((item: any) => this.mapToEntity(item));
    }

    async findByUserIdAndRole(userId: string, userRole: string, limit: number = 20): Promise<Payout[]> {
        const data = await this.prisma.payout.findMany({
            where: { userId, userRole },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return data.map((item: any) => this.mapToEntity(item));
    }

    async update(payout: Payout): Promise<void> {
        const data = payout.toObject();

        await this.prisma.payout.update({
            where: { id: data.id },
            data: {
                status: data.status as any,
                reference: data.reference,
                processedAt: data.processedAt,
                completedAt: data.completedAt,
                failedAt: data.failedAt,
                failureReason: data.failureReason,
                metadata: data.metadata as any,
                updatedAt: new Date(),
            }
        });
    }

    private mapToEntity(data: any): Payout {
        return new Payout({
            id: data.id,
            userId: data.userId,
            userRole: data.userRole,
            amount: Number(data.amount),
            currency: data.currency,
            method: data.method as PayoutMethod,
            status: data.status as PayoutStatus,
            bankDetails: data.bankDetails as any,
            mobileMoneyDetails: data.mobileMoneyDetails as any,
            reference: data.reference,
            processedAt: data.processedAt,
            completedAt: data.completedAt,
            failedAt: data.failedAt,
            failureReason: data.failureReason,
            fee: Number(data.fee),
            netAmount: Number(data.netAmount),
            metadata: data.metadata as any,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        });
    }
}
