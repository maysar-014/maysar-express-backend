import { ReputationTier } from '../entities/business-profile.entity';
import { EngagementQuota, QuotaType } from '../value-objects/engagement-quota.value-object';

export interface EngagementLimits {
    posts: number;
    comments: number;
    threads: number;
    articles: number;
    challenges: number;
}

export interface CoolingPeriodConfig {
    similarPostsMinutes: number;
    sameTopicMinutes: number;
}

export class EngagementPolicy {
    private static readonly DEFAULT_LIMITS: Record<ReputationTier, EngagementLimits> = {
        [ReputationTier.NEWCOMER]: {
            posts: 3,
            comments: 10,
            threads: 2,
            articles: 0,
            challenges: 1,
        },
        [ReputationTier.CONTRIBUTOR]: {
            posts: 5,
            comments: 20,
            threads: 3,
            articles: 1,
            challenges: 2,
        },
        [ReputationTier.EXPERT]: {
            posts: 8,
            comments: 30,
            threads: 5,
            articles: 2,
            challenges: 3,
        },
        [ReputationTier.MENTOR]: {
            posts: 10,
            comments: 40,
            threads: 7,
            articles: 3,
            challenges: 5,
        },
        [ReputationTier.THOUGHT_LEADER]: {
            posts: 15,
            comments: 50,
            threads: 10,
            articles: 5,
            challenges: 7,
        },
    };

    private static readonly COOLING_PERIODS: CoolingPeriodConfig = {
        similarPostsMinutes: 60,
        sameTopicMinutes: 30,
    };

    private static readonly MIN_CONTENT_QUALITY_SCORE = 40;
    private static readonly MIN_NEWCOMER_QUALITY_SCORE = 60;

    static getDailyLimitForTier(tier: ReputationTier, quotaType: QuotaType): number {
        const limits = this.DEFAULT_LIMITS[tier];

        switch (quotaType) {
            case 'POST':
                return limits.posts;
            case 'COMMENT':
                return limits.comments;
            case 'THREAD':
                return limits.threads;
            case 'ARTICLE':
                return limits.articles;
            case 'CHALLENGE':
                return limits.challenges;
            default:
                return 0;
        }
    }

    static canCreateContent(
        quota: EngagementQuota,
        tier: ReputationTier
    ): { allowed: boolean; reason?: string } {
        if (!quota.canPerformAction()) {
            return {
                allowed: false,
                reason: `Daily quota exceeded. Resets in ${this.formatTimeUntilReset(quota.getTimeUntilReset().daily)}`,
            };
        }

        return { allowed: true };
    }

    static requiresTopicSelection(quotaType: QuotaType): boolean {
        return ['THREAD', 'ARTICLE', 'CHALLENGE'].includes(quotaType);
    }

    static requiresCategorization(quotaType: QuotaType): boolean {
        return ['THREAD', 'ARTICLE', 'CHALLENGE', 'POST'].includes(quotaType);
    }

    static meetsMinimumQualityScore(score: number, tier: ReputationTier): boolean {
        if (tier === ReputationTier.NEWCOMER) {
            return score >= this.MIN_NEWCOMER_QUALITY_SCORE;
        }

        return score >= this.MIN_CONTENT_QUALITY_SCORE;
    }

    static getCoolingPeriodMinutes(tier: ReputationTier, quotaType: QuotaType): number {
        // Higher tiers have shorter cooling periods
        const basePeriod = quotaType === 'POST' ? 30 : 15;

        const tierMultiplier = tier === ReputationTier.THOUGHT_LEADER ? 0.2 :
            tier === ReputationTier.MENTOR ? 0.4 :
                tier === ReputationTier.EXPERT ? 0.6 :
                    tier === ReputationTier.CONTRIBUTOR ? 0.8 : 1.0;

        return Math.ceil(basePeriod * tierMultiplier);
    }

    static isWithinCoolingPeriod(
        lastPostTime: Date,
        isSimilarContent: boolean,
        isSameTopic: boolean
    ): { withinCoolingPeriod: boolean; remainingMinutes?: number } {
        const now = new Date();
        const minutesSinceLastPost = Math.floor(
            (now.getTime() - lastPostTime.getTime()) / (1000 * 60)
        );

        if (isSimilarContent && minutesSinceLastPost < this.COOLING_PERIODS.similarPostsMinutes) {
            return {
                withinCoolingPeriod: true,
                remainingMinutes: this.COOLING_PERIODS.similarPostsMinutes - minutesSinceLastPost,
            };
        }

        if (isSameTopic && minutesSinceLastPost < this.COOLING_PERIODS.sameTopicMinutes) {
            return {
                withinCoolingPeriod: true,
                remainingMinutes: this.COOLING_PERIODS.sameTopicMinutes - minutesSinceLastPost,
            };
        }

        return { withinCoolingPeriod: false };
    }

    static calculateQualityBonus(contentScore: number, tier: ReputationTier): number {
        // High-quality content earns bonus quota
        const baseBonus = contentScore >= 80 ? 2 : contentScore >= 70 ? 1 : 0;

        // Higher tiers get larger bonuses
        const tierMultiplier = tier === ReputationTier.THOUGHT_LEADER ? 1.5 :
            tier === ReputationTier.MENTOR ? 1.3 :
                tier === ReputationTier.EXPERT ? 1.2 : 1.0;

        return Math.floor(baseBonus * tierMultiplier);
    }

    static validateContentStructure(
        quotaType: QuotaType,
        content: { topic?: string; content: string; category?: string }
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (this.requiresTopicSelection(quotaType) && !content.topic) {
            errors.push('Topic is required for this content type');
        }

        if (this.requiresCategorization(quotaType) && !content.category) {
            errors.push('Category is required for this content type');
        }

        if (!content.content || content.content.trim().length === 0) {
            errors.push('Content cannot be empty');
        }

        // Minimum length requirements
        const minLengths: Record<QuotaType, number> = {
            POST: 20,
            COMMENT: 10,
            THREAD: 50,
            ARTICLE: 200,
            CHALLENGE: 100,
        };

        const minLength = minLengths[quotaType];
        if (content.content.length < minLength) {
            errors.push(`Content must be at least ${minLength} characters`);
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    static canUserMentorOthers(tier: ReputationTier, contributionScore: number): boolean {
        return tier >= ReputationTier.EXPERT && contributionScore >= 2000;
    }

    static getWeeklyLimitMultiplier(tier: ReputationTier): number {
        // Weekly limits are typically 4-5x daily limits
        const multipliers: Record<ReputationTier, number> = {
            [ReputationTier.NEWCOMER]: 4,
            [ReputationTier.CONTRIBUTOR]: 4,
            [ReputationTier.EXPERT]: 5,
            [ReputationTier.MENTOR]: 5,
            [ReputationTier.THOUGHT_LEADER]: 5,
        };

        return multipliers[tier];
    }

    private static formatTimeUntilReset(milliseconds: number): string {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}
