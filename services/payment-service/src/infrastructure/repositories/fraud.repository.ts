import { Prisma } from '@prisma/client';
import { FraudAssessment, TransactionData } from '../../domain/engines/fraud.engine';
import {
    DeviceReputation,
    IFraudRepository,
    UserBehavior,
    UserLocation,
    UserProfile
} from '../../domain/repositories/fraud.repository';

type DecimalLike = number | string | Prisma.Decimal | null | undefined;

interface PaymentRecord {
    id: string;
    userId: string;
    amount: DecimalLike;
    currency: string;
    method: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
}

interface FraudAssessmentRecord {
    riskScore: number;
}

interface PaymentDelegate {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    aggregate(args: Record<string, unknown>): Promise<{ _avg: { amount: DecimalLike } }>;
}

interface FraudAssessmentDelegate {
    create(args: Record<string, unknown>): Promise<unknown>;
    findMany(args: Record<string, unknown>): Promise<FraudAssessmentRecord[]>;
    upsert(args: Record<string, unknown>): Promise<unknown>;
    findUnique(args: Record<string, unknown>): Promise<unknown>;
}

interface FraudRepositoryPrisma {
    payment_Payment?: PaymentDelegate;
    payment?: PaymentDelegate;
    payment_FraudAssessment?: FraudAssessmentDelegate;
    fraudAssessment?: FraudAssessmentDelegate;
}

export class FraudRepository implements IFraudRepository {
    constructor(private readonly prisma: FraudRepositoryPrisma) { }

    async saveAssessment(assessment: FraudAssessment): Promise<void> {
        await this.fraudAssessmentDelegate.create({
            data: {
                transactionId: assessment.transactionId,
                riskScore: assessment.riskScore,
                riskLevel: assessment.riskLevel,
                recommendation: assessment.recommendation,
                confidence: assessment.confidence,
                flags: assessment.flags as unknown as Prisma.InputJsonValue,
                processingTime: assessment.processingTime,
            }
        });
    }

    async getRecentTransactions(userId: string, windowSeconds: number): Promise<TransactionData[]> {
        const since = new Date(Date.now() - windowSeconds * 1000);

        const payments = await this.paymentDelegate.findMany({
            where: {
                userId: userId,
                createdAt: {
                    gte: since
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return payments.map((paymentRecord: unknown) => {
            const payment = paymentRecord as PaymentRecord;
            const metadata = this.getMetadata(payment.metadata);

            return {
                transactionId: payment.id,
                userId: payment.userId,
                amount: this.toNumber(payment.amount),
                currency: payment.currency,
                paymentMethod: payment.method,
                ipAddress: this.readString(metadata, 'ipAddress', '0.0.0.0'),
                deviceFingerprint: this.readString(metadata, 'deviceFingerprint', 'unknown'),
                billingAddress: this.readRecord(metadata, 'billingAddress'),
                shippingAddress: this.readRecord(metadata, 'shippingAddress'),
                timestamp: payment.createdAt
            };
        });
    }

    async getUserProfile(userId: string): Promise<UserProfile> {
        const aggregations = await this.paymentDelegate.aggregate({
            where: {
                userId: userId,
                status: 'COMPLETED'
            },
            _avg: {
                amount: true
            }
        });

        return {
            averageTransaction: this.toNumber(aggregations._avg.amount)
        };
    }

    async getUserLocationHistory(userId: string): Promise<UserLocation[]> {
        const payments = await this.paymentDelegate.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const locations: UserLocation[] = [];

        for (const paymentRecord of payments) {
            const payment = paymentRecord as PaymentRecord;
            const metadata = this.getMetadata(payment.metadata);
            const location = this.readRecord(metadata, 'location');
            const ipLocation = this.readRecord(metadata, 'ipLocation');

            if (metadata?.location) {
                locations.push({
                    country: this.readString(location, 'country', 'Unknown'),
                    city: this.readString(location, 'city', 'Unknown'),
                    lat: this.readNumber(location, 'lat', 0),
                    lng: this.readNumber(location, 'lng', 0),
                    timestamp: payment.createdAt
                });
            } else if (metadata?.ipLocation) {
                locations.push({
                    country: this.readString(ipLocation, 'country', 'Unknown'),
                    city: this.readString(ipLocation, 'city', 'Unknown'),
                    lat: this.readNumber(ipLocation, 'lat', 0),
                    lng: this.readNumber(ipLocation, 'lng', 0),
                    timestamp: payment.createdAt
                });
            }
        }

        return locations;
    }

    async getDeviceHistory(userId: string): Promise<string[]> {
        const payments = await this.paymentDelegate.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const devices = new Set<string>();
        for (const paymentRecord of payments) {
            const payment = paymentRecord as PaymentRecord;
            const metadata = this.getMetadata(payment.metadata);
            if (metadata?.deviceFingerprint) {
                devices.add(this.readString(metadata, 'deviceFingerprint', 'unknown'));
            }
        }

        return Array.from(devices);
    }

    async getDeviceReputation(fingerprint: string): Promise<DeviceReputation> {
        const payments = await this.paymentDelegate.findMany({
            where: {
                metadata: {
                    path: ['deviceFingerprint'],
                    equals: fingerprint
                }
            },
            select: { id: true },
            take: 50,
            orderBy: { createdAt: 'desc' }
        });

        if (payments.length === 0) {
            return { riskScore: 0 };
        }

        const paymentIds = payments.map((paymentRecord: unknown) => (paymentRecord as PaymentRecord).id);

        const assessments = await this.fraudAssessmentDelegate.findMany({
            where: {
                transactionId: { in: paymentIds }
            }
        });

        if (assessments.length === 0) {
            return { riskScore: 0 };
        }

        let totalRisk = 0;
        for (const assessment of assessments) {
            totalRisk += assessment.riskScore;
        }

        const avgRisk = totalRisk / assessments.length;
        return { riskScore: Math.round(avgRisk) };
    }

    async getUserBehavior(userId: string): Promise<UserBehavior> {
        const payments = await this.paymentDelegate.findMany({
            where: { userId },
            select: {
                createdAt: true,
                method: true
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const activeHoursSet = new Set<number>();
        const paymentMethodsSet = new Set<string>();

        for (const paymentRecord of payments) {
            const payment = paymentRecord as PaymentRecord;
            activeHoursSet.add(payment.createdAt.getHours());
            paymentMethodsSet.add(payment.method);
        }

        return {
            activeHours: Array.from(activeHoursSet).sort((a, b) => a - b),
            paymentMethods: Array.from(paymentMethodsSet)
        };
    }

    async saveResult(paymentId: string, result: any): Promise<void> {
        // Legacy/Simplified method implementation
        await this.fraudAssessmentDelegate.upsert({
            where: { transactionId: paymentId },
            update: { confidence: result.score || 0 },
            create: {
                transactionId: paymentId,
                riskScore: result.score || 0,
                riskLevel: result.level || 'LOW',
                recommendation: 'APPROVE',
                confidence: 1,
                flags: [],
                processingTime: 0
            }
        });
    }

    async findResultByPaymentId(paymentId: string): Promise<any> {
        return this.fraudAssessmentDelegate.findUnique({
            where: { transactionId: paymentId }
        });
    }

    private get paymentDelegate(): PaymentDelegate {
        const delegate = this.prisma.payment_Payment ?? this.prisma.payment;
        if (!delegate) {
            throw new Error('Payment delegate is not configured on prisma client');
        }
        return delegate;
    }

    private get fraudAssessmentDelegate(): FraudAssessmentDelegate {
        const delegate = this.prisma.payment_FraudAssessment ?? this.prisma.fraudAssessment;
        if (!delegate) {
            throw new Error('Fraud assessment delegate is not configured on prisma client');
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

    private getMetadata(value: Prisma.JsonValue | null): Record<string, unknown> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        return value as Record<string, unknown>;
    }

    private readRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
        const value = source[key];
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        return value as Record<string, unknown>;
    }

    private readString(source: Record<string, unknown>, key: string, fallback: string): string {
        const value = source[key];
        return typeof value === 'string' && value.length > 0 ? value : fallback;
    }

    private readNumber(source: Record<string, unknown>, key: string, fallback: number): number {
        const value = source[key];
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? fallback : parsed;
        }
        return fallback;
    }
}
