import { KnowledgeArticle, KnowledgeArticleProps, ReviewStatus } from '../../domain/entities/knowledge-article.entity';
import { ContributionScore, ContributionScoreProps } from '../../domain/value-objects/contribution-score.value-object';
import { ExpertiseBadge, ExpertiseBadgeProps, ExpertiseLevel } from '../../domain/value-objects/expertise-badge.value-object';
import { EngagementQuota, EngagementQuotaProps, QuotaType } from '../../domain/value-objects/engagement-quota.value-object';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { Post, PostType, PostVisibility, PostStatus } from '../../domain/entities/post.entity';
import { TrustMetadata } from '../../domain/value-objects/trust-metadata.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';

export class CommunityFactory {
    static createKnowledgeArticle(overrides: Partial<KnowledgeArticleProps> = {}): KnowledgeArticle {
        return new KnowledgeArticle({
            id: makeId(getModelPrefix('Community_KnowledgeArticle')),
            authorId: makeId(getModelPrefix('User_User')),
            title: 'How to Improve Supply Chain Efficiency',
            summary: 'This article provides actionable steps for small businesses to optimize their supply chain and reduce costs through better inventory management.',
            sections: [
                { heading: 'Introduction', content: 'Starting with supply chain basics...', order: 1 }
            ],
            category: 'LOGISTICS',
            industryTags: ['Retail', 'Manufacturing'],
            expertiseLevel: 'INTERMEDIATE',
            reviewStatus: ReviewStatus.DRAFT,
            qualityScore: 0,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides
        } as KnowledgeArticleProps);
    }

    static createContributionScore(overrides: Partial<ContributionScoreProps> = {}): ContributionScore {
        return new ContributionScore({
            score: 100,
            answerAcceptanceRate: 0.5,
            peerUpvotes: 10,
            expertEndorsements: 2,
            lastContributionAt: new Date(),
            qualityMultiplier: 1.0,
            ...overrides
        });
    }

    static createExpertiseBadge(overrides: Partial<ExpertiseBadgeProps> = {}): ExpertiseBadge {
        return new ExpertiseBadge({
            area: 'Supply Chain',
            level: 'INTERMEDIATE' as ExpertiseLevel,
            peerEndorsements: [],
            trainingCompletions: [],
            businessVerified: false,
            ...overrides
        } as ExpertiseBadgeProps);
    }

    static createEngagementQuota(overrides: Partial<EngagementQuotaProps> = {}): EngagementQuota {
        return new EngagementQuota({
            userId: makeId(getModelPrefix('User_User')),
            quotaType: 'POST' as QuotaType,
            dailyRemaining: 5,
            weeklyRemaining: 20,
            dailyLimit: 5,
            weeklyLimit: 20,
            dailyResetAt: new Date(Date.now() + 86400000),
            weeklyResetAt: new Date(Date.now() + 86400000 * 7),
            qualityBonusEarned: 0,
            ...overrides
        });
    }

    static createUser(overrides: any = {}): User {
        const id = overrides.id || makeId(getModelPrefix('User_User'));
        const username = overrides.username || `user_${id.substring(0, 8)}`;
        const displayName = overrides.displayName || `User ${id.substring(0, 4)}`;
        const role = overrides.role || UserRole.BUYER;
        const trustMetadata = overrides.trustMetadata || TrustMetadata.createDefault();

        return User.create({
            id,
            username,
            displayName,
            role,
            trustMetadata
        });
    }

    static createPost(overrides: any = {}): Post {
        const id = overrides.id || makeId(getModelPrefix('Post'));
        const authorId = overrides.authorId || makeId(getModelPrefix('User_User'));
        const content = overrides.content || 'Sample post content';
        const type = overrides.type || PostType.TEXT;

        if (overrides.status === PostStatus.PUBLISHED) {
            return Post.createPublished({
                id,
                authorId,
                content,
                type,
                ...overrides
            });
        }

        return Post.create({
            id,
            authorId,
            content,
            type,
            ...overrides
        });
    }
}
