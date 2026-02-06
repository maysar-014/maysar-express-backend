import { PrismaClient } from '@prisma/client';
import { IBadgeRepository, Badge } from '../../domain/repositories/badge.repository';

export class PrismaBadgeRepository implements IBadgeRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async save(badge: Badge): Promise<void> {
        await this.prisma.badge.upsert({
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
        const badges = await this.prisma.badge.findMany({
            where: { learnerId }
        });
        return badges as Badge[];
    }

    public async findByType(type: string): Promise<Badge[]> {
        const badges = await this.prisma.badge.findMany({
            where: { type }
        });
        return badges as Badge[];
    }
}
