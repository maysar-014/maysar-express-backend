/**
 * Payment Repository Implementation
 * Prisma-based repository for payment persistence
 */

import { Prisma } from '@prisma/client';
import { Payment, PaymentProps, PaymentStatus, PaymentMethod, PaymentProvider } from '../../domain/entities/payment.entity';
import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { OptimisticLockError } from '../../../../../shared/errors/optimistic-lock.error';

type DecimalLike = number | string | Prisma.Decimal | null | undefined;

interface PaymentRecord {
    id: string;
    orderId: string;
    userId: string;
    amount: DecimalLike;
    currency: string;
    method: string;
    provider: string;
    status: string;
    metadata: Prisma.JsonValue | null;
    refundedAmount: DecimalLike;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    version: number;
}

interface PaymentAggregateResult {
    _sum: {
        amount: DecimalLike;
    };
}

interface PaymentDelegate {
    create(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
    findFirst(args: Record<string, unknown>): Promise<unknown | null>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
    aggregate(args: Record<string, unknown>): Promise<PaymentAggregateResult>;
    count(args: Record<string, unknown>): Promise<number>;
}

interface PaymentRepositoryPrisma {
    payment_Payment?: PaymentDelegate;
    payment?: PaymentDelegate;
}

export class PaymentRepository implements IPaymentRepository {
    constructor(private readonly prisma: PaymentRepositoryPrisma) { }

    // Backward-compatible alias used by legacy tests.
    async create(payment: Payment): Promise<void> {
        return this.save(payment);
    }

    async save(payment: Payment): Promise<void> {
        const props = payment.toObject();

        await this.paymentDelegate.create({
            data: {
                id: props.id,
                orderId: props.orderId,
                userId: props.userId,
                amount: props.amount,
                currency: props.currency,
                method: props.method,
                provider: props.provider,
                status: props.status,
                metadata: props.metadata as unknown as Prisma.InputJsonValue,
                refundedAmount: props.refundedAmount || 0,
                failureReason: props.failureReason,
                createdAt: props.createdAt,
                updatedAt: props.updatedAt,
                completedAt: props.completedAt,
                version: 0,
            },
        });
    }

    async findById(id: string): Promise<Payment | null> {
        const payment = await this.paymentDelegate.findUnique({
            where: { id },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async findByOrderId(orderId: string): Promise<Payment | null> {
        const payment = await this.paymentDelegate.findFirst({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Payment[]> {
        const payments = await this.paymentDelegate.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        return payments.map((paymentRecord: unknown) => this.toDomain(paymentRecord));
    }

    async findByProviderReference(providerRef: string): Promise<Payment | null> {
        const payment = await this.paymentDelegate.findFirst({
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

        const result = await this.paymentDelegate.updateMany({
            where: { id: props.id, version: props.version ?? 0 },
            data: {
                status: props.status,
                metadata: props.metadata as unknown as Prisma.InputJsonValue,
                refundedAmount: props.refundedAmount,
                failureReason: props.failureReason,
                updatedAt: props.updatedAt,
                completedAt: props.completedAt,
                version: { increment: 1 },
            },
        });

        if (result.count === 0) {
            throw new OptimisticLockError(`Payment ${props.id} version ${props.version} was modified concurrently`);
        }

        // Keep in-memory version in sync with DB so subsequent updates don't conflict
        payment.incrementVersion();
    }

    async getTotalAmountByUserId(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        const result = await this.paymentDelegate.aggregate({
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

        return this.toNumber(result._sum.amount);
    }

    async getPaymentCountByUserId(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return await this.paymentDelegate.count({
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
        const payments = await this.paymentDelegate.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return payments.map((paymentRecord: unknown) => this.toDomain(paymentRecord));
    }

    async findPendingOlderThan(date: Date): Promise<Payment[]> {
        const payments = await this.paymentDelegate.findMany({
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

        return payments.map((paymentRecord: unknown) => this.toDomain(paymentRecord));
    }

    private get paymentDelegate(): PaymentDelegate {
        const delegate = this.prisma.payment_Payment ?? this.prisma.payment;
        if (!delegate) {
            throw new Error('Payment delegate is not configured on prisma client');
        }
        return delegate;
    }

    private toNumber(value: DecimalLike): number {
        if (value === null || value === undefined) {
            return 0;
        }
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? 0 : parsed;
        }
        if (value instanceof Prisma.Decimal) {
            return value.toNumber();
        }
        return 0;
    }

    private toDomain(data: unknown): Payment {
        const row = data as PaymentRecord;
        const props: PaymentProps = {
            id: row.id,
            orderId: row.orderId,
            userId: row.userId,
            amount: this.toNumber(row.amount),
            currency: row.currency,
            method: row.method as PaymentMethod,
            provider: row.provider as PaymentProvider,
            status: row.status as PaymentStatus,
            metadata: (row.metadata ?? {}) as PaymentProps['metadata'],
            refundedAmount: this.toNumber(row.refundedAmount),
            failureReason: row.failureReason ?? undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            completedAt: row.completedAt ?? undefined,
            version: row.version,
        };

        return new Payment(props);
    }
}
