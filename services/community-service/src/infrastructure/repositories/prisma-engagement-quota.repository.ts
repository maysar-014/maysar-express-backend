import { PrismaClient } from '@prisma/client';
import { EngagementQuota, QuotaType } from '../../domain/value-objects/engagement-quota.value-object';
import {
    EngagementQuotaRepository
} from '../../application/use-cases/create-discussion-thread.use-case';

export class PrismaEngagementQuotaRepository implements EngagementQuotaRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findByUserAndType(
        userId: string,
        quotaType: QuotaType
    ): Promise<EngagementQuota | null> {
        const quota = await this.prisma.community_EngagementQuota.findUnique({
            where: {
                userId_quotaType: {
                    userId,
                    quotaType,
                },
            },
        });

        return quota ? this.toDomain(quota) : null;
    }

    async save(quota: EngagementQuota): Promise<EngagementQuota> {
        const data = {
            userId: quota.userId,
            quotaType: quota.quotaType,
            dailyLimit: quota.dailyLimit,
            weeklyLimit: quota.weeklyLimit,
            dailyRemaining: quota.dailyRemaining,
            weeklyRemaining: quota.weeklyRemaining,
            dailyResetAt: quota.dailyResetAt,
            weeklyResetAt: quota.weeklyResetAt,
            qualityBonusEarned: quota.qualityBonusEarned,
            updatedAt: new Date(),
        };

        const saved = await this.prisma.community_EngagementQuota.upsert({
            where: {
                userId_quotaType: {
                    userId: quota.userId,
                    quotaType: quota.quotaType,
                },
            },
            create: data,
            update: data,
        });

        return this.toDomain(saved);
    }

    private toDomain(record: any): EngagementQuota {
        return new EngagementQuota({
            userId: record.userId,
            quotaType: record.quotaType as QuotaType,
            dailyLimit: record.dailyLimit,
            weeklyLimit: record.weeklyLimit,
            dailyRemaining: record.dailyRemaining,
            weeklyRemaining: record.weeklyRemaining,
            dailyResetAt: record.dailyResetAt,
            weeklyResetAt: record.weeklyResetAt,
            qualityBonusEarned: record.qualityBonusEarned,
        });
    }
}
