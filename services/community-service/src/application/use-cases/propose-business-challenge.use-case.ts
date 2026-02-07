import { BusinessChallenge, SuccessCriteria } from '../../domain/entities/business-challenge.entity';
import { EngagementQuota, QuotaType } from '../../domain/value-objects/engagement-quota.value-object';
import { ReputationTier } from '../../domain/entities/business-profile.entity';
import { EngagementPolicy } from '../../domain/policies/engagement-policy';
import { ContentModerationPolicy } from '../../domain/policies/content-moderation.policy';
import { DiscussionMatchingEngine } from '../../domain/engines/discussion-matching-engine';

export interface ProposeBusinessChallengeRequest {
    proposerId: string;
    title: string;
    description: string;
    category: string;
    industryTags: string[];
    constraints: string[];
    successCriteria: SuccessCriteria[];
    deadline?: Date;
}

export interface ProposeBusinessChallengeResponse {
    challenge: BusinessChallenge;
    matchedExperts: string[];
    quotaRemaining: number;
}

export interface BusinessChallengeRepository {
    save(challenge: BusinessChallenge): Promise<BusinessChallenge>;
    findSimilar(title: string, category: string, withinDays: number): Promise<BusinessChallenge[]>;
}

export interface BusinessProfileRepository {
    findByUserId(userId: string): Promise<{
        id: string;
        userId: string;
        reputationTier: ReputationTier;
        expertiseAreas: Array<{ area: string; level: any }>;
    } | null>;
}

export interface EngagementQuotaRepository {
    findByUserAndType(userId: string, quotaType: QuotaType): Promise<EngagementQuota | null>;
    save(quota: EngagementQuota): Promise<EngagementQuota>;
}

export interface ExpertProfileProvider {
    getAvailableExperts(): Promise<Array<{
        userId: string;
        expertiseAreas: Array<{ area: string; level: any }>;
        isAvailableForMentorship: boolean;
        mentorshipCapacity: number;
        currentMentees: number;
        responseHistory: {
            totalResponses: number;
            acceptedAnswers: number;
            averageResponseTimeMinutes: number;
        };
        topicRelevanceScores: Map<string, number>;
    }>>;
}

export interface EventPublisher {
    publish(eventName: string, payload: any): Promise<void>;
}

export class ProposeBusinessChallengeUseCase {
    constructor(
        private readonly challengeRepository: BusinessChallengeRepository,
        private readonly profileRepository: BusinessProfileRepository,
        private readonly quotaRepository: EngagementQuotaRepository,
        private readonly expertProvider: ExpertProfileProvider,
        private readonly eventPublisher: EventPublisher
    ) { }

    async execute(request: ProposeBusinessChallengeRequest): Promise<ProposeBusinessChallengeResponse> {
        // 1. Get user's business profile
        const profile = await this.profileRepository.findByUserId(request.proposerId);
        if (!profile) {
            throw new Error('User business profile not found');
        }

        // 2. Check engagement quota
        let quota = await this.quotaRepository.findByUserAndType(request.proposerId, 'CHALLENGE');
        if (!quota) {
            const config = EngagementQuota.getDefaultConfig('CHALLENGE');
            const dailyLimit = EngagementPolicy.getDailyLimitForTier(profile.reputationTier, 'CHALLENGE');
            const weeklyLimit = dailyLimit * EngagementPolicy.getWeeklyLimitMultiplier(profile.reputationTier);

            quota = EngagementQuota.create(request.proposerId, 'CHALLENGE', {
                daily: dailyLimit,
                weekly: weeklyLimit,
                qualityBonus: config.qualityBonus,
            });
        }

        const quotaCheck = EngagementPolicy.canCreateContent(quota, profile.reputationTier);
        if (!quotaCheck.allowed) {
            throw new Error(quotaCheck.reason || 'Quota exceeded');
        }

        // 3. Validate content structure
        const structureValidation = EngagementPolicy.validateContentStructure('CHALLENGE', {
            content: request.description,
            category: request.category,
            topic: request.title,
        });

        if (!structureValidation.valid) {
            throw new Error(`Invalid challenge structure: ${structureValidation.errors.join(', ')}`);
        }

        // 4. Validate success criteria
        if (request.successCriteria.length === 0) {
            throw new Error('Challenge must have at least one success criterion');
        }

        const hasMeasurableCriteria = request.successCriteria.some(c => c.measurable);
        if (!hasMeasurableCriteria) {
            throw new Error('At least one success criterion must be measurable');
        }

        // 5. Check for similar challenges
        const similar = await this.challengeRepository.findSimilar(request.title, request.category, 30);
        if (similar.length > 0) {
            throw new Error('Similar challenge exists within the last 30 days');
        }

        // 6. Assess content quality
        const assessment = ContentModerationPolicy.performFullAssessment({
            contentType: 'CHALLENGE',
            content: {
                description: request.description,
                title: request.title,
                category: request.category,
                businessContext: {
                    industry: request.industryTags,
                    businessStage: '', // Would come from profile
                    tags: request.industryTags,
                },
                successCriteria: request.successCriteria,
            },
            userTier: profile.reputationTier,
            userExpertise: profile.expertiseAreas,
        });

        if (!assessment.meetsQualityThreshold) {
            throw new Error(`Content quality below threshold: ${assessment.issues.join(', ')}`);
        }

        // 7. Create business challenge
        const challengeId = this.generateId();
        const challenge = BusinessChallenge.create({
            id: challengeId,
            proposerId: request.proposerId,
            title: request.title,
            description: request.description,
            category: request.category,
            industryTags: request.industryTags,
            constraints: request.constraints,
            successCriteria: request.successCriteria,
            deadline: request.deadline,
        });

        // 8. Save challenge
        const savedChallenge = await this.challengeRepository.save(challenge);

        // 9. Consume quota
        quota.consumeQuota();
        await this.quotaRepository.save(quota);

        // 10. Match experts who can help
        const availableExperts = await this.expertProvider.getAvailableExperts();
        const matches = DiscussionMatchingEngine.matchExpertsToThread(
            {
                topic: request.title,
                category: request.category,
                expertiseLevel: 'ADVANCED', // Challenges typically need advanced expertise
                industryTags: request.industryTags,
            },
            availableExperts
        );

        const matchedExpertIds = matches.map(m => m.userId);

        // 11. Publish event
        await this.eventPublisher.publish('ChallengeProposed', {
            challengeId: savedChallenge.id,
            proposerId: request.proposerId,
            title: request.title,
            category: request.category,
            industryTags: request.industryTags,
            matchedExperts: matchedExpertIds,
            deadline: request.deadline,
            qualityScore: assessment.qualityScore,
            timestamp: new Date(),
        });

        // 12. Award quality bonus
        const qualityBonus = EngagementPolicy.calculateQualityBonus(
            assessment.qualityScore,
            profile.reputationTier
        );

        if (qualityBonus > 0) {
            quota.awardQualityBonus(qualityBonus);
            await this.quotaRepository.save(quota);
        }

        return {
            challenge: savedChallenge,
            matchedExperts: matchedExpertIds,
            quotaRemaining: quota.dailyRemaining,
        };
    }

    private generateId(): string {
        return `challenge_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
