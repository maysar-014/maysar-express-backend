import { ExpertiseBadge, ExpertiseLevel } from '../value-objects/expertise-badge.value-object';
import { ReputationTier } from '../entities/business-profile.entity';

export interface ValidationRequirements {
    minPeerEndorsements: number;
    minTrainingCompletions: number;
    requireBusinessVerification: boolean;
    minContributionScore: number;
}

export class ExpertiseValidationPolicy {
    private static readonly LEVEL_REQUIREMENTS: Record<ExpertiseLevel, ValidationRequirements> = {
        BEGINNER: {
            minPeerEndorsements: 0,
            minTrainingCompletions: 0,
            requireBusinessVerification: false,
            minContributionScore: 0,
        },
        INTERMEDIATE: {
            minPeerEndorsements: 2,
            minTrainingCompletions: 1,
            requireBusinessVerification: false,
            minContributionScore: 200,
        },
        EXPERT: {
            minPeerEndorsements: 5,
            minTrainingCompletions: 3,
            requireBusinessVerification: true,
            minContributionScore: 1000,
        },
        MENTOR: {
            minPeerEndorsements: 10,
            minTrainingCompletions: 5,
            requireBusinessVerification: true,
            minContributionScore: 3000,
        },
    };

    private static readonly BADGE_EXPIRATION_DAYS: Record<ExpertiseLevel, number | null> = {
        BEGINNER: null, // Never expires
        INTERMEDIATE: 730, // 2 years
        EXPERT: 730, // 2 years
        MENTOR: 365, // 1 year (requires active mentorship)
    };

    private static readonly MIN_REPUTATION_TIER: Record<ExpertiseLevel, ReputationTier> = {
        BEGINNER: ReputationTier.NEWCOMER,
        INTERMEDIATE: ReputationTier.CONTRIBUTOR,
        EXPERT: ReputationTier.EXPERT,
        MENTOR: ReputationTier.MENTOR,
    };

    static canEarnBadge(
        level: ExpertiseLevel,
        params: {
            peerEndorsements: number;
            trainingCompletions: number;
            businessVerified: boolean;
            contributionScore: number;
            reputationTier: ReputationTier;
        }
    ): { eligible: boolean; missingRequirements: string[] } {
        const requirements = this.LEVEL_REQUIREMENTS[level];
        const missingRequirements: string[] = [];

        if (params.peerEndorsements < requirements.minPeerEndorsements) {
            missingRequirements.push(
                `Need ${requirements.minPeerEndorsements - params.peerEndorsements} more peer endorsements`
            );
        }

        if (params.trainingCompletions < requirements.minTrainingCompletions) {
            missingRequirements.push(
                `Need ${requirements.minTrainingCompletions - params.trainingCompletions} more training completions`
            );
        }

        if (requirements.requireBusinessVerification && !params.businessVerified) {
            missingRequirements.push('Business verification required');
        }

        if (params.contributionScore < requirements.minContributionScore) {
            missingRequirements.push(
                `Need ${requirements.minContributionScore - params.contributionScore} more contribution points`
            );
        }

        const minTier = this.MIN_REPUTATION_TIER[level];
        if (!this.meetsReputationTierRequirement(params.reputationTier, minTier)) {
            missingRequirements.push(`Minimum reputation tier: ${minTier}`);
        }

        return {
            eligible: missingRequirements.length === 0,
            missingRequirements,
        };
    }

    static canUpgradeBadge(
        currentBadge: ExpertiseBadge,
        targetLevel: ExpertiseLevel,
        params: {
            contributionScore: number;
            reputationTier: ReputationTier;
        }
    ): { canUpgrade: boolean; reason?: string } {
        const levels: ExpertiseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'MENTOR'];
        const currentIndex = levels.indexOf(currentBadge.level);
        const targetIndex = levels.indexOf(targetLevel);

        if (targetIndex <= currentIndex) {
            return {
                canUpgrade: false,
                reason: 'Can only upgrade to higher levels',
            };
        }

        const requirements = this.LEVEL_REQUIREMENTS[targetLevel];

        const eligibility = this.canEarnBadge(targetLevel, {
            peerEndorsements: currentBadge.peerEndorsements.length,
            trainingCompletions: currentBadge.trainingCompletions.length,
            businessVerified: currentBadge.businessVerified,
            contributionScore: params.contributionScore,
            reputationTier: params.reputationTier,
        });

        if (!eligibility.eligible) {
            return {
                canUpgrade: false,
                reason: `Missing requirements: ${eligibility.missingRequirements.join(', ')}`,
            };
        }

        return { canUpgrade: true };
    }

    static requiresRenewal(badge: ExpertiseBadge): boolean {
        const expirationDays = this.BADGE_EXPIRATION_DAYS[badge.level];

        if (expirationDays === null) {
            return false;
        }

        if (!badge.verifiedAt) {
            return false;
        }

        const daysSinceVerification = Math.floor(
            (new Date().getTime() - badge.verifiedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSinceVerification >= expirationDays;
    }

    static canEndorseBadge(
        endorserLevel: ExpertiseLevel,
        targetLevel: ExpertiseLevel
    ): boolean {
        const levels: ExpertiseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'MENTOR'];
        const endorserIndex = levels.indexOf(endorserLevel);
        const targetIndex = levels.indexOf(targetLevel);

        // Can only endorse equal or lower levels
        return endorserIndex >= targetIndex;
    }

    static getExpirationDate(level: ExpertiseLevel, verificationDate: Date): Date | null {
        const expirationDays = this.BADGE_EXPIRATION_DAYS[level];

        if (expirationDays === null) {
            return null;
        }

        const expirationDate = new Date(verificationDate);
        expirationDate.setDate(expirationDate.getDate() + expirationDays);
        return expirationDate;
    }

    static shouldRevokeBadge(
        badge: ExpertiseBadge,
        params: {
            inactivityDays: number;
            contributionScore: number;
            recentViolations: number;
        }
    ): { shouldRevoke: boolean; reason?: string } {
        // Revoke if expired and not renewed
        if (badge.isExpired()) {
            return {
                shouldRevoke: true,
                reason: 'Badge has expired',
            };
        }

        // Revoke if inactive for extended period
        const maxInactivityDays: Record<ExpertiseLevel, number> = {
            BEGINNER: 365,
            INTERMEDIATE: 180,
            EXPERT: 120,
            MENTOR: 90,
        };

        if (params.inactivityDays > maxInactivityDays[badge.level]) {
            return {
                shouldRevoke: true,
                reason: `Inactive for ${params.inactivityDays} days`,
            };
        }

        // Revoke if contribution score drops below threshold
        const requirements = this.LEVEL_REQUIREMENTS[badge.level];
        if (params.contributionScore < requirements.minContributionScore * 0.5) {
            return {
                shouldRevoke: true,
                reason: 'Contribution score dropped below minimum threshold',
            };
        }

        // Revoke if multiple community guideline violations
        if (params.recentViolations >= 3) {
            return {
                shouldRevoke: true,
                reason: 'Multiple community guideline violations',
            };
        }

        return { shouldRevoke: false };
    }

    static validatePeerEndorsement(
        endorser: {
            expertiseLevel: ExpertiseLevel;
            area: string;
        },
        target: {
            area: string;
            level: ExpertiseLevel;
        }
    ): { valid: boolean; reason?: string } {
        // Must have expertise in the same area
        if (endorser.area !== target.area) {
            return {
                valid: false,
                reason: 'Endorser must have expertise in the same area',
            };
        }

        // Must have sufficient level to endorse
        if (!this.canEndorseBadge(endorser.expertiseLevel, target.level)) {
            return {
                valid: false,
                reason: 'Endorser level must be equal or higher than target level',
            };
        }

        return { valid: true };
    }

    private static meetsReputationTierRequirement(
        currentTier: ReputationTier,
        requiredTier: ReputationTier
    ): boolean {
        const tiers: ReputationTier[] = [
            ReputationTier.NEWCOMER,
            ReputationTier.CONTRIBUTOR,
            ReputationTier.EXPERT,
            ReputationTier.MENTOR,
            ReputationTier.THOUGHT_LEADER,
        ];

        const currentIndex = tiers.indexOf(currentTier);
        const requiredIndex = tiers.indexOf(requiredTier);

        return currentIndex >= requiredIndex;
    }
}
