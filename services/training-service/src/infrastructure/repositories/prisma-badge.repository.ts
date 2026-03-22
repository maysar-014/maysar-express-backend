import { PrismaClient } from '@prisma/client';
import { IBadgeRepository, Badge } from '../../domain/repositories/badge.repository';

interface BadgeDelegate {
    upsert(args: Record<string, unknown>): Promise<unknown>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
}

export class PrismaBadgeRepository implements IBadgeRepository {
    constructor(private readonly prisma: PrismaClient) { }

    private warnedMissingDelegate = false;
    private readonly fallbackBadges: Badge[] = [];

    private warnMissingDelegate(message: string): void {
        if (this.warnedMissingDelegate) return;
        this.warnedMissingDelegate = true;
        console.warn(message);
    }

    public async save(badge: Badge): Promise<void> {
        const delegate = this.badgeDelegate;
        if (!delegate) {
            this.fallbackBadges.push(badge);
            return;
        }

        try {
            await delegate.upsert({
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
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Badge persistence failed; using fallback.');
                this.fallbackBadges.push(badge);
                return;
            }
            throw error;
        }
    }

    public async findByLearnerId(learnerId: string): Promise<Badge[]> {
        const delegate = this.badgeDelegate;
        if (!delegate) {
            return this.fallbackBadges.filter((badge) => badge.learnerId === learnerId);
        }

        try {
            const badges = await delegate.findMany({
                where: { learnerId }
            });
            return badges as Badge[];
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Badge lookup failed; using fallback.');
                return this.fallbackBadges.filter((badge) => badge.learnerId === learnerId);
            }
            throw error;
        }
    }

    public async findByType(type: string): Promise<Badge[]> {
        const delegate = this.badgeDelegate;
        if (!delegate) {
            return this.fallbackBadges.filter((badge) => badge.type === type);
        }

        try {
            const badges = await delegate.findMany({
                where: { type }
            });
            return badges as Badge[];
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Badge lookup failed; using fallback.');
                return this.fallbackBadges.filter((badge) => badge.type === type);
            }
            throw error;
        }
    }

    private get badgeDelegate(): BadgeDelegate | null {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.badge ??
            client.training_Badge) as BadgeDelegate | undefined;
        if (!delegate) {
            this.warnMissingDelegate('[training] Badge delegate missing; using fallback.');
            return null;
        }
        return delegate;
    }
}
