import { KnowledgeArticle, ArticleSection, ReviewStatus } from '../../domain/entities/knowledge-article.entity';
import { EngagementQuota, QuotaType } from '../../domain/value-objects/engagement-quota.value-object';
import { ReputationTier } from '../../domain/entities/business-profile.entity';
import { EngagementPolicy } from '../../domain/policies/engagement-policy';
import { ContentModerationPolicy } from '../../domain/policies/content-moderation.policy';

export interface SubmitKnowledgeArticleRequest {
    authorId: string;
    title: string;
    summary: string;
    sections: ArticleSection[];
    category: string;
    industryTags: string[];
    expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export interface SubmitKnowledgeArticleResponse {
    article: KnowledgeArticle;
    requiresPeerReview: boolean;
    quotaRemaining: number;
}

export interface KnowledgeArticleRepository {
    save(article: KnowledgeArticle): Promise<KnowledgeArticle>;
    findByTitleAndAuthor(title: string, authorId: string): Promise<KnowledgeArticle | null>;
}

export interface BusinessProfileRepository {
    findByUserId(userId: string): Promise<{
        id: string;
        userId: string;
        reputationTier: ReputationTier;
        contributionScore: number;
        expertiseAreas: Array<{ area: string; level: any }>;
    } | null>;
}

export interface EngagementQuotaRepository {
    findByUserAndType(userId: string, quotaType: QuotaType): Promise<EngagementQuota | null>;
    save(quota: EngagementQuota): Promise<EngagementQuota>;
}

export interface EventPublisher {
    publish(eventName: string, payload: any): Promise<void>;
}

export class SubmitKnowledgeArticleUseCase {
    private static readonly MIN_REPUTATION_SCORE = 500;

    constructor(
        private readonly articleRepository: KnowledgeArticleRepository,
        private readonly profileRepository: BusinessProfileRepository,
        private readonly quotaRepository: EngagementQuotaRepository,
        private readonly eventPublisher: EventPublisher
    ) { }

    async execute(request: SubmitKnowledgeArticleRequest): Promise<SubmitKnowledgeArticleResponse> {
        // 1. Get user's business profile and verify reputation
        const profile = await this.profileRepository.findByUserId(request.authorId);
        if (!profile) {
            throw new Error('User business profile not found');
        }

        if (profile.contributionScore < SubmitKnowledgeArticleUseCase.MIN_REPUTATION_SCORE) {
            throw new Error(
                `Insufficient reputation to publish articles. Need ${SubmitKnowledgeArticleUseCase.MIN_REPUTATION_SCORE} points, have ${profile.contributionScore}`
            );
        }

        // 2. Check engagement quota
        let quota = await this.quotaRepository.findByUserAndType(request.authorId, 'ARTICLE');
        if (!quota) {
            const config = EngagementQuota.getDefaultConfig('ARTICLE');
            const dailyLimit = EngagementPolicy.getDailyLimitForTier(profile.reputationTier, 'ARTICLE');
            const weeklyLimit = dailyLimit * EngagementPolicy.getWeeklyLimitMultiplier(profile.reputationTier);

            quota = EngagementQuota.create(request.authorId, 'ARTICLE', {
                daily: dailyLimit,
                weekly: weeklyLimit,
                qualityBonus: config.qualityBonus,
            });
        }

        const quotaCheck = EngagementPolicy.canCreateContent(quota, profile.reputationTier);
        if (!quotaCheck.allowed) {
            throw new Error(quotaCheck.reason || 'Quota exceeded');
        }

        // 3. Validate article structure
        const structureValidation = EngagementPolicy.validateContentStructure('ARTICLE', {
            content: this.combineArticleContent(request.sections),
            category: request.category,
            topic: request.title,
        });

        if (!structureValidation.valid) {
            throw new Error(`Invalid article structure: ${structureValidation.errors.join(', ')}`);
        }

        // 4. Check for duplicate title
        const existing = await this.articleRepository.findByTitleAndAuthor(request.title, request.authorId);
        if (existing) {
            throw new Error('An article with this title already exists');
        }

        // 5. Validate business context
        const businessContextValidation = ContentModerationPolicy.validateBusinessContext({
            industry: request.industryTags,
            businessStage: '', // Would come from profile
            tags: request.industryTags,
        });

        if (!businessContextValidation.valid) {
            throw new Error(`Invalid business context: ${businessContextValidation.errors.join(', ')}`);
        }

        // 6. Create knowledge article
        const articleId = this.generateId();
        const article = KnowledgeArticle.create({
            id: articleId,
            authorId: request.authorId,
            title: request.title,
            summary: request.summary,
            sections: request.sections,
            category: request.category,
            industryTags: request.industryTags,
            expertiseLevel: request.expertiseLevel,
        });

        // 7. Determine if peer review is required
        const requiresReview = this.shouldRequirePeerReview(profile.reputationTier, article);

        if (requiresReview) {
            article.submitForReview();
        }

        // 8. Save article
        const savedArticle = await this.articleRepository.save(article);

        // 9. Consume quota
        quota.consumeQuota();
        await this.quotaRepository.save(quota);

        // 10. Publish event
        await this.eventPublisher.publish('KnowledgeArticleSubmitted', {
            articleId: savedArticle.id,
            authorId: request.authorId,
            title: request.title,
            category: request.category,
            expertiseLevel: request.expertiseLevel,
            industryTags: request.industryTags,
            requiresPeerReview: requiresReview,
            reviewStatus: savedArticle.reviewStatus,
            timestamp: new Date(),
        });

        return {
            article: savedArticle,
            requiresPeerReview: requiresReview,
            quotaRemaining: quota.dailyRemaining,
        };
    }

    private shouldRequirePeerReview(tier: ReputationTier, article: KnowledgeArticle): boolean {
        // Always require review for newcomers and contributors
        if (tier === ReputationTier.NEWCOMER || tier === ReputationTier.CONTRIBUTOR) {
            return true;
        }

        // Require review for expert-level content from non-experts
        if (article.expertiseLevel === 'EXPERT' && tier < ReputationTier.EXPERT) {
            return true;
        }

        // Experts and above can skip review for beginner/intermediate content
        if (tier >= ReputationTier.EXPERT &&
            (article.expertiseLevel === 'BEGINNER' || article.expertiseLevel === 'INTERMEDIATE')) {
            return false;
        }

        // Default to requiring review
        return true;
    }

    private combineArticleContent(sections: ArticleSection[]): string {
        return sections.map(s => `${s.heading}\n${s.content}`).join('\n\n');
    }

    private generateId(): string {
        return `article_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
