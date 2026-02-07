import { ContributionScore } from '../value-objects/contribution-score.value-object';
import { ReputationTier } from '../entities/business-profile.entity';
import { ExpertiseBadge } from '../value-objects/expertise-badge.value-object';

export interface ReputationMetrics {
    contributionScore: number;
    expertiseBadges: number;
    peerEndorsements: number;
    helpfulAnswers: number;
    knowledgeShared: number;
    mentorshipHours: number;
    articlesPublished: number;
    challengesSolved: number;
}

export interface ReputationTrend {
    current: ReputationTier;
    previous: ReputationTier;
    direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
    scoreChange: number;
    daysInCurrentTier: number;
}

export interface UnlockableFeature {
    feature: string;
    description: string;
    requiredTier: ReputationTier;
    requiredScore: number;
    unlocked: boolean;
}

export class ReputationEngine {
    private static readonly TIER_THRESHOLDS: Record<ReputationTier, number> = {
        [ReputationTier.NEWCOMER]: 0,
        [ReputationTier.CONTRIBUTOR]: 500,
        [ReputationTier.EXPERT]: 2000,
        [ReputationTier.MENTOR]: 5000,
        [ReputationTier.THOUGHT_LEADER]: 10000,
    };

    private static readonly FEATURES: UnlockableFeature[] = [
        {
            feature: 'create_knowledge_articles',
            description: 'Publish knowledge articles',
            requiredTier: ReputationTier.CONTRIBUTOR,
            requiredScore: 500,
            unlocked: false,
        },
        {
            feature: 'mentor_others',
            description: 'Become a mentor',
            requiredTier: ReputationTier.EXPERT,
            requiredScore: 2000,
            unlocked: false,
        },
        {
            feature: 'validate_expertise',
            description: 'Validate other users\' expertise',
            requiredTier: ReputationTier.EXPERT,
            requiredScore: 2000,
            unlocked: false,
        },
        {
            feature: 'propose_challenges',
            description: 'Propose business challenges',
            requiredTier: ReputationTier.CONTRIBUTOR,
            requiredScore: 500,
            unlocked: false,
        },
        {
            feature: 'priority_matching',
            description: 'Priority expert matching on questions',
            requiredTier: ReputationTier.MENTOR,
            requiredScore: 5000,
            unlocked: false,
        },
        {
            feature: 'host_sessions',
            description: 'Host learning sessions',
            requiredTier: ReputationTier.MENTOR,
            requiredScore: 5000,
            unlocked: false,
        },
        {
            feature: 'influence_algorithms',
            description: 'Influence content ranking algorithms',
            requiredTier: ReputationTier.THOUGHT_LEADER,
            requiredScore: 10000,
            unlocked: false,
        },
    ];

    static calculateReputation(metrics: ReputationMetrics): {
        tier: ReputationTier;
        score: number;
        nextTier?: ReputationTier;
        progressToNext: number;
    } {
        const tier = this.determineTier(metrics.contributionScore);
        const nextTier = this.getNextTier(tier);

        let progressToNext = 0;
        if (nextTier) {
            const currentThreshold = this.TIER_THRESHOLDS[tier];
            const nextThreshold = this.TIER_THRESHOLDS[nextTier];
            const range = nextThreshold - currentThreshold;
            const progress = metrics.contributionScore - currentThreshold;
            progressToNext = Math.min(100, Math.floor((progress / range) * 100));
        }

        return {
            tier,
            score: metrics.contributionScore,
            nextTier,
            progressToNext,
        };
    }

    static determineTier(contributionScore: number): ReputationTier {
        const tiers: ReputationTier[] = [
            ReputationTier.THOUGHT_LEADER,
            ReputationTier.MENTOR,
            ReputationTier.EXPERT,
            ReputationTier.CONTRIBUTOR,
            ReputationTier.NEWCOMER,
        ];

        for (const tier of tiers) {
            if (contributionScore >= this.TIER_THRESHOLDS[tier]) {
                return tier;
            }
        }

        return ReputationTier.NEWCOMER;
    }

    static analyzeReputationTrend(params: {
        currentScore: number;
        previousScore: number;
        currentTier: ReputationTier;
        tierChangeDate?: Date;
    }): ReputationTrend {
        const scoreDelta = params.currentScore - params.previousScore;
        const previousTier = this.determineTier(params.previousScore);

        let direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
        if (scoreDelta > 100) {
            direction = 'IMPROVING';
        } else if (scoreDelta < -100) {
            direction = 'DECLINING';
        } else {
            direction = 'STABLE';
        }

        const daysInCurrentTier = params.tierChangeDate
            ? Math.floor((new Date().getTime() - params.tierChangeDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
            current: params.currentTier,
            previous: previousTier,
            direction,
            scoreChange: scoreDelta,
            daysInCurrentTier,
        };
    }

    static getUnlockableFeatures(
        currentTier: ReputationTier,
        currentScore: number
    ): UnlockableFeature[] {
        return this.FEATURES.map(feature => ({
            ...feature,
            unlocked: this.isFeatureUnlocked(currentTier, currentScore, feature),
        }));
    }

    private static isFeatureUnlocked(
        currentTier: ReputationTier,
        currentScore: number,
        feature: UnlockableFeature
    ): boolean {
        const tierMet = this.compareTiers(currentTier, feature.requiredTier) >= 0;
        const scoreMet = currentScore >= feature.requiredScore;
        return tierMet && scoreMet;
    }

    private static compareTiers(tier1: ReputationTier, tier2: ReputationTier): number {
        const levels: ReputationTier[] = [
            ReputationTier.NEWCOMER,
            ReputationTier.CONTRIBUTOR,
            ReputationTier.EXPERT,
            ReputationTier.MENTOR,
            ReputationTier.THOUGHT_LEADER,
        ];

        return levels.indexOf(tier1) - levels.indexOf(tier2);
    }

    private static getNextTier(currentTier: ReputationTier): ReputationTier | undefined {
        const tiers: ReputationTier[] = [
            ReputationTier.NEWCOMER,
            ReputationTier.CONTRIBUTOR,
            ReputationTier.EXPERT,
            ReputationTier.MENTOR,
            ReputationTier.THOUGHT_LEADER,
        ];

        const currentIndex = tiers.indexOf(currentTier);
        return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : undefined;
    }

    static calculateImpact(metrics: ReputationMetrics): {
        overallImpact: number;
        breakdown: {
            knowledge: number;
            mentorship: number;
            problemSolving: number;
            community: number;
        };
    } {
        // Knowledge impact (0-100)
        const knowledgeImpact = Math.min(100,
            metrics.knowledgeShared * 5 +
            metrics.articlesPublished * 10
        );

        // Mentorship impact (0-100)
        const mentorshipImpact = Math.min(100,
            metrics.mentorshipHours * 3 +
            metrics.helpfulAnswers * 2
        );

        // Problem-solving impact (0-100)
        const problemSolvingImpact = Math.min(100,
            metrics.challengesSolved * 15 +
            metrics.helpfulAnswers * 2
        );

        // Community impact (0-100)
        const communityImpact = Math.min(100,
            metrics.peerEndorsements * 5 +
            metrics.expertiseBadges * 15
        );

        const overallImpact = Math.floor(
            (knowledgeImpact + mentorshipImpact + problemSolvingImpact + communityImpact) / 4
        );

        return {
            overallImpact,
            breakdown: {
                knowledge: knowledgeImpact,
                mentorship: mentorshipImpact,
                problemSolving: problemSolvingImpact,
                community: communityImpact,
            },
        };
    }

    static getReputationBenefits(tier: ReputationTier): string[] {
        const benefits: Record<ReputationTier, string[]> = {
            [ReputationTier.NEWCOMER]: [
                'Participate in discussions',
                'Ask questions',
                'Comment on posts',
            ],
            [ReputationTier.CONTRIBUTOR]: [
                'All NEWCOMER benefits',
                'Create knowledge articles',
                'Propose business challenges',
                'Higher daily quotas',
            ],
            [ReputationTier.EXPERT]: [
                'All CONTRIBUTOR benefits',
                'Become a mentor',
                'Validate expertise of others',
                'Priority support',
                'Featured expert badge',
            ],
            [ReputationTier.MENTOR]: [
                'All EXPERT benefits',
                'Host learning sessions',
                'Priority expert matching',
                'Influence ranking algorithms',
                'Exclusive mentor community',
            ],
            [ReputationTier.THOUGHT_LEADER]: [
                'All MENTOR benefits',
                'Shape platform direction',
                'Unlimited quotas',
                'Represent platform publicly',
                'Early access to new features',
            ],
        };

        return benefits[tier];
    }

    static shouldBePromoted(
        currentTier: ReputationTier,
        metrics: ReputationMetrics
    ): { shouldPromote: boolean; nextTier?: ReputationTier; reason?: string } {
        const nextTier = this.getNextTier(currentTier);

        if (!nextTier) {
            return { shouldPromote: false, reason: 'Already at highest tier' };
        }

        const requiredScore = this.TIER_THRESHOLDS[nextTier];

        if (metrics.contributionScore >= requiredScore) {
            return {
                shouldPromote: true,
                nextTier,
                reason: `Contribution score of ${metrics.contributionScore} meets ${nextTier} threshold`,
            };
        }

        return {
            shouldPromote: false,
            reason: `Need ${requiredScore - metrics.contributionScore} more points for ${nextTier}`,
        };
    }

    static shouldBeDemoted(
        currentTier: ReputationTier,
        metrics: ReputationMetrics,
        inactivityDays: number
    ): { shouldDemote: boolean; reason?: string } {
        // Don't demote newcomers
        if (currentTier === ReputationTier.NEWCOMER) {
            return { shouldDemote: false };
        }

        // Check if score has fallen below current tier minimum
        const currentThreshold = this.TIER_THRESHOLDS[currentTier];
        if (metrics.contributionScore < currentThreshold * 0.7) {
            return {
                shouldDemote: true,
                reason: `Score dropped below 70% of ${currentTier} threshold`,
            };
        }

        // Check for extended inactivity
        const maxInactivityDays: Record<ReputationTier, number> = {
            [ReputationTier.NEWCOMER]: 365,
            [ReputationTier.CONTRIBUTOR]: 180,
            [ReputationTier.EXPERT]: 120,
            [ReputationTier.MENTOR]: 90,
            [ReputationTier.THOUGHT_LEADER]: 60,
        };

        if (inactivityDays > maxInactivityDays[currentTier]) {
            return {
                shouldDemote: true,
                reason: `Inactive for ${inactivityDays} days (max ${maxInactivityDays[currentTier]})`,
            };
        }

        return { shouldDemote: false };
    }
}
