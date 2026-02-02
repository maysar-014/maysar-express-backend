/**
 * Payment Repository Implementation
 * Prisma-based repository for payment persistence
 */

import { PrismaClient } from '@prisma/client';
import { Payment, PaymentProps, PaymentStatus, PaymentMethod, PaymentProvider } from '../../domain/entities/payment.entity';
import { IPaymentRepository } from '../../domain/ports/payment.repository.port';

export class PaymentRepository implements IPaymentRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(payment: Payment): Promise<void> {
        const props = payment.toObject();

        await this.prisma.payment.create({
            data: {
                id: props.id,
                orderId: props.orderId,
                userId: props.userId,
                amount: props.amount,
                currency: props.currency,
                method: props.method,
                provider: props.provider,
                status: props.status,
                metadata: props.metadata as any,
                refundedAmount: props.refundedAmount || 0,
                failureReason: props.failureReason,
                createdAt: props.createdAt,
                updatedAt: props.updatedAt,
                completedAt: props.completedAt,
            },
        });
    }

    async findById(id: string): Promise<Payment | null> {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async findByOrderId(orderId: string): Promise<Payment | null> {
        const payment = await this.prisma.payment.findFirst({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Payment[]> {
        const payments = await this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        return payments.map((p) => this.toDomain(p));
    }

    async findByProviderReference(providerRef: string): Promise<Payment | null> {
        const payment = await this.prisma.payment.findFirst({
            where: {
                metadata: {
                    path: ['providerReference'],
                    equals: providerRef,
                },
            },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async update(payment: Payment): Promise<void> {
        const props = payment.toObject();

        await this.prisma.payment.update({
            where: { id: props.id },
            data: {
                status: props.status,
                metadata: props.metadata as any,
                refundedAmount: props.refundedAmount,
                failureReason: props.failureReason,
                updatedAt: props.updatedAt,
                completedAt: props.completedAt,
            },
        });
    }

    async getTotalAmountByUserId(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        const result = await this.prisma.payment.aggregate({
            where: {
                userId,
                status: PaymentStatus.COMPLETED,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return result._sum.amount || 0;
    }

    async getPaymentCountByUserId(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return await this.prisma.payment.count({
            where: {
                userId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
    }

    async findByStatus(status: string, limit: number = 100): Promise<Payment[]> {
        const payments = await this.prisma.payment.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return payments.map((p) => this.toDomain(p));
    }

    async findPendingOlderThan(date: Date): Promise<Payment[]> {
        const payments = await this.prisma.payment.findMany({
            where: {
                status: {
                    in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
                },
                createdAt: {
                    lt: date,
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return payments.map((p) => this.toDomain(p));
    }

    private toDomain(data: any): Payment {
        const props: PaymentProps = {
            id: data.id,
            orderId: data.orderId,
            userId: data.userId,
            amount: data.amount,
            currency: data.currency,
            method: data.method as PaymentMethod,
            provider: data.provider as PaymentProvider,
            status: data.status as PaymentStatus,
            metadata: data.metadata || {},
            refundedAmount: data.refundedAmount,
            failureReason: data.failureReason,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            completedAt: data.completedAt,
        };

        return new Payment(props);
    }
}
