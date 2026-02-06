import { PrismaClient } from '@prisma/client';
import { IRefundRepository } from '../../domain/repositories/refund.repository';
import { Refund, RefundStatus, RefundReason } from '../../domain/entities/refund.entity';

export class RefundRepository implements IRefundRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(refund: Refund): Promise<void> {
        const data = refund.toObject();

        await this.prisma.refund.create({
            data: {
                id: data.id,
                paymentId: data.paymentId,
                orderId: data.orderId,
                userId: data.userId,
                amount: data.amount,
                currency: data.currency,
                reason: data.reason,
                reasonDetails: data.reasonDetails,
                status: data.status as any,
                providerRef: data.providerRef,
                processedAt: data.processedAt,
                completedAt: data.completedAt,
                failedAt: data.failedAt,
                failureReason: data.failureReason,
                metadata: data.metadata as any,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }
        });
    }

    async findById(id: string): Promise<Refund | null> {
        const data = await this.prisma.refund.findUnique({
            where: { id }
        });

        if (!data) return null;

        return this.mapToEntity(data);
    }

    async findByPaymentId(paymentId: string): Promise<Refund[]> {
        const data = await this.prisma.refund.findMany({
            where: { paymentId },
            orderBy: { createdAt: 'desc' }
        });

        return data.map((item: any) => this.mapToEntity(item));
    }

    async update(refund: Refund): Promise<void> {
        const data = refund.toObject();

        await this.prisma.refund.update({
            where: { id: data.id },
            data: {
                status: data.status as any,
                providerRef: data.providerRef,
                processedAt: data.processedAt,
                completedAt: data.completedAt,
                failedAt: data.failedAt,
                failureReason: data.failureReason,
                metadata: data.metadata as any,
                updatedAt: new Date(), // Always update timestamp
            }
        });
    }

    private mapToEntity(data: any): Refund {
        return new Refund({
            id: data.id,
            paymentId: data.paymentId,
            orderId: data.orderId,
            userId: data.userId,
            amount: Number(data.amount),
            currency: data.currency,
            reason: data.reason as RefundReason,
            reasonDetails: data.reasonDetails,
            status: data.status as RefundStatus,
            providerRef: data.providerRef,
            processedAt: data.processedAt,
            completedAt: data.completedAt,
            failedAt: data.failedAt,
            failureReason: data.failureReason,
            metadata: data.metadata as any,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        });
    }
}
