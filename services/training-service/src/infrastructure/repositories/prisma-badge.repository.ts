import { PrismaClient } from '@prisma/client';
import { IBadgeRepository, Badge } from '../../domain/repositories/badge.repository';

interface BadgeDelegate {
    upsert(args: Record<string, unknown>): Promise<unknown>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
}

export class PrismaBadgeRepository implements IBadgeRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async save(badge: Badge): Promise<void> {
        await this.badgeDelegate.upsert({
            where: { id: badge.id },
            update: {
                reason: badge.reason,
                metadata: badge.metadata
            },
            create: {
                id: badge.id,
                learnerId: badge.learnerId,
                type: badge.type,
                reason: badge.reason,
                metadata: badge.metadata,
                awardedAt: badge.awardedAt
            }
        });
    }

    public async findByLearnerId(learnerId: string): Promise<Badge[]> {
        const badges = await this.badgeDelegate.findMany({
            where: { learnerId }
        });
        return badges as Badge[];
    }

    public async findByType(type: string): Promise<Badge[]> {
        const badges = await this.badgeDelegate.findMany({
            where: { type }
        });
        return badges as Badge[];
    }

    private get badgeDelegate(): BadgeDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.badge ??
            client.training_Badge) as BadgeDelegate | undefined;
        if (!delegate) {
            throw new Error('Badge delegate is not configured on prisma client');
        }
        return delegate;
    }
}
