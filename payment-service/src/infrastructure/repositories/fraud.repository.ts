import { PrismaClient, Payment } from '@prisma/client';
import { FraudAssessment, TransactionData, FraudFlag } from '../../domain/engines/fraud.engine';
import {
    DeviceReputation,
    IFraudRepository,
    UserBehavior,
    UserLocation,
    UserProfile
} from '../../domain/ports/fraud.repository.port';

export class FraudRepository implements IFraudRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async saveAssessment(assessment: FraudAssessment): Promise<void> {
        await this.prisma.fraudAssessment.create({
            data: {
                transactionId: assessment.transactionId,
                riskScore: assessment.riskScore,
                riskLevel: assessment.riskLevel,
                recommendation: assessment.recommendation,
                confidence: assessment.confidence,
                flags: assessment.flags as any, // Prisma Json
                processingTime: assessment.processingTime,
            }
        });
    }

    async getRecentTransactions(userId: string, windowSeconds: number): Promise<TransactionData[]> {
        const since = new Date(Date.now() - windowSeconds * 1000);

        const payments = await this.prisma.payment.findMany({
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

        // Explicitly cast or type usage
        return payments.map((p: Payment) => {
            const metadata = p.metadata as any || {};
            return {
                transactionId: p.id,
                userId: p.userId,
                amount: Number(p.amount),
                currency: p.currency,
                paymentMethod: p.method,
                ipAddress: metadata.ipAddress || '0.0.0.0',
                deviceFingerprint: metadata.deviceFingerprint || 'unknown',
                billingAddress: metadata.billingAddress || {},
                shippingAddress: metadata.shippingAddress || {},
                timestamp: p.createdAt
            };
        });
    }

    async getUserProfile(userId: string): Promise<UserProfile> {
        const aggregations = await this.prisma.payment.aggregate({
            where: {
                userId: userId,
                status: 'COMPLETED'
            },
            _avg: {
                amount: true
            }
        });

        return {
            averageTransaction: Number(aggregations._avg.amount || 0)
        };
    }

    async getUserLocationHistory(userId: string): Promise<UserLocation[]> {
        const payments = await this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const locations: UserLocation[] = [];

        for (const p of payments) {
            const metadata = p.metadata as any;
            if (metadata?.location) {
                locations.push({
                    country: metadata.location.country || 'Unknown',
                    city: metadata.location.city || 'Unknown',
                    lat: metadata.location.lat || 0,
                    lng: metadata.location.lng || 0,
                    timestamp: p.createdAt
                });
            } else if (metadata?.ipLocation) {
                locations.push({
                    country: metadata.ipLocation.country || 'Unknown',
                    city: metadata.ipLocation.city || 'Unknown',
                    lat: metadata.ipLocation.lat || 0,
                    lng: metadata.ipLocation.lng || 0,
                    timestamp: p.createdAt
                });
            }
        }

        return locations;
    }

    async getDeviceHistory(userId: string): Promise<string[]> {
        const payments = await this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const devices = new Set<string>();
        for (const p of payments) {
            const metadata = p.metadata as any;
            if (metadata?.deviceFingerprint) {
                devices.add(metadata.deviceFingerprint);
            }
        }

        return Array.from(devices);
    }

    async getDeviceReputation(fingerprint: string): Promise<DeviceReputation> {
        const payments = await this.prisma.payment.findMany({
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

        const paymentIds = payments.map(p => p.id);

        const assessments = await this.prisma.fraudAssessment.findMany({
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
        const payments = await this.prisma.payment.findMany({
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

        for (const p of payments) {
            activeHoursSet.add(p.createdAt.getHours());
            paymentMethodsSet.add(p.method);
        }

        return {
            activeHours: Array.from(activeHoursSet).sort((a, b) => a - b),
            paymentMethods: Array.from(paymentMethodsSet)
        };
    }
}
