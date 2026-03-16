import { DiscussionThread, ExpertiseLevel, BusinessContext } from '../../domain/entities/discussion-thread.entity';
import { EngagementQuota, QuotaType } from '../../domain/value-objects/engagement-quota.value-object';
import { EngagementPolicy } from '../../domain/policies/engagement-policy';
import { ContentModerationPolicy } from '../../domain/policies/content-moderation.policy';
import { DiscussionMatchingEngine } from '../../domain/engines/discussion-matching-engine';
import { ReputationTier } from '../../domain/entities/business-profile.entity';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface CreateDiscussionThreadRequest {
    authorId: string;
    topic: string;
    content: string;
    category: string;
    expertiseLevel: ExpertiseLevel;
    businessContext: BusinessContext;
    maxResponsesPerUser?: number;
}

export interface CreateDiscussionThreadResponse {
    thread: DiscussionThread;
    matchedExperts: string[];
    quotaRemaining: number;
}

export interface DiscussionThreadRepository {
    save(thread: DiscussionThread): Promise<DiscussionThread>;
    findDuplicates(topic: string, authorId: string, withinHours: number): Promise<DiscussionThread[]>;
}

export interface EngagementQuotaRepository {
    findByUserAndType(userId: string, quotaType: QuotaType): Promise<EngagementQuota | null>;
    save(quota: EngagementQuota): Promise<EngagementQuota>;
}

export interface BusinessProfileRepository {
    findByUserId(userId: string): Promise<{
        id: string;
        userId: string;
        reputationTier: ReputationTier;
        expertiseAreas: Array<{ area: string; level: any }>;
    } | null>;
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

export class CreateDiscussionThreadUseCase {
    constructor(
        private readonly threadRepository: DiscussionThreadRepository,
        private readonly quotaRepository: EngagementQuotaRepository,
        private readonly profileRepository: BusinessProfileRepository,
        private readonly expertProvider: ExpertProfileProvider,
        private readonly eventPublisher: EventPublisher
    ) { }

    async execute(request: CreateDiscussionThreadRequest): Promise<CreateDiscussionThreadResponse> {
        // 1. Get user's business profile
        const profile = await this.profileRepository.findByUserId(request.authorId);
        if (!profile) {
            throw new Error('User business profile not found');
        }

        // 2. Check engagement quota
        let quota = await this.quotaRepository.findByUserAndType(request.authorId, 'THREAD');
        if (!quota) {
            const config = EngagementQuota.getDefaultConfig('THREAD');
            const dailyLimit = EngagementPolicy.getDailyLimitForTier(profile.reputationTier, 'THREAD');
            const weeklyLimit = dailyLimit * EngagementPolicy.getWeeklyLimitMultiplier(profile.reputationTier);

            quota = EngagementQuota.create(request.authorId, 'THREAD', {
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
        const structureValidation = EngagementPolicy.validateContentStructure('THREAD', {
            topic: request.topic,
            content: request.content,
            category: request.category,
        });

        if (!structureValidation.valid) {
            throw new Error(`Invalid thread structure: ${structureValidation.errors.join(', ')}`);
        }

        // 4. Check for duplicate threads
        const duplicates = await this.threadRepository.findDuplicates(request.topic, request.authorId, 24);
        if (duplicates.length > 0) {
            throw new Error('Similar thread already exists within the last 24 hours');
        }

        // 5. Assess content quality
        const assessment = ContentModerationPolicy.performFullAssessment({
            contentType: 'THREAD',
            content: {
                content: request.content,
                businessContext: request.businessContext,
                category: request.category,
                topic: request.topic,
            },
            userTier: profile.reputationTier,
            userExpertise: profile.expertiseAreas,
        });

        if (!assessment.meetsQualityThreshold) {
            throw new Error(`Content quality below threshold: ${assessment.issues.join(', ')}`);
        }

        // 6. Create discussion thread
        const threadId = this.generateId();
        const thread = DiscussionThread.create({
            id: threadId,
            authorId: request.authorId,
            topic: request.topic,
            content: request.content,
            category: request.category,
            expertiseLevel: request.expertiseLevel,
            businessContext: request.businessContext,
            maxResponsesPerUser: request.maxResponsesPerUser,
        });

        // 7. Save thread
        const savedThread = await this.threadRepository.save(thread);

        // 8. Consume quota
        quota.consumeQuota();
        await this.quotaRepository.save(quota);

        // 9. Match experts to thread
        const availableExperts = await this.expertProvider.getAvailableExperts();
        const matches = DiscussionMatchingEngine.matchExpertsToThread(
            {
                topic: request.topic,
                category: request.category,
                expertiseLevel: request.expertiseLevel,
                industryTags: request.businessContext.industry,
            },
            availableExperts
        );

        const matchedExpertIds = matches.map(m => m.userId);

        // 10. Publish event
        await this.eventPublisher.publish('ThreadCreated', {
            threadId: savedThread.id,
            authorId: request.authorId,
            topic: request.topic,
            category: request.category,
            expertiseLevel: request.expertiseLevel,
            matchedExperts: matchedExpertIds,
            qualityScore: assessment.qualityScore,
            timestamp: new Date(),
        });

        // 11. Award quality bonus if applicable
        const qualityBonus = EngagementPolicy.calculateQualityBonus(
            assessment.qualityScore,
            profile.reputationTier
        );

        if (qualityBonus > 0) {
            quota.awardQualityBonus(qualityBonus);
            await this.quotaRepository.save(quota);
        }

        return {
            thread: savedThread,
            matchedExperts: matchedExpertIds,
            quotaRemaining: quota.dailyRemaining,
        };
    }

    private generateId(): string {
        return makeId(getModelPrefix('Community_DiscussionThread'));
    }
}
