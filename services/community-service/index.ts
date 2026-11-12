import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';
import { createKnowledgeRouter, createCommunityRouter } from './src/api/routes/community.routes';
import { createDiscussionsRouter } from './src/api/routes/discussions.routes';
import { postsRoutes } from './src/api/routes/posts.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { KnowledgeController } from './src/api/controllers/knowledge.controller';
import { CommunityController } from './src/api/controllers/community.controller';
import { DiscussionsController } from './src/api/controllers/discussions.controller';
import { SubmitKnowledgeArticleUseCase } from './src/application/use-cases/submit-knowledge-article.use-case';
import { CreateDiscussionThreadUseCase } from './src/application/use-cases/create-discussion-thread.use-case';
import { AnswerQuestionUseCase } from './src/application/use-cases/answer-question.use-case';
import { ProposeBusinessChallengeUseCase } from './src/application/use-cases/propose-business-challenge.use-case';
import { ValidateExpertiseUseCase } from './src/application/use-cases/validate-expertise.use-case';
import { DiscoverContentUseCase } from './src/application/use-cases/discover-content.use-case';
import { PrismaKnowledgeArticleRepository } from './src/infrastructure/repositories/prisma-knowledge-article.repository';
import { PrismaBusinessProfileRepository } from './src/infrastructure/repositories/prisma-business-profile.repository';
import { PrismaEngagementQuotaRepository } from './src/infrastructure/repositories/prisma-engagement-quota.repository';
import { PrismaDiscussionThreadRepository } from './src/infrastructure/repositories/prisma-discussion-thread.repository';
import { PrismaBusinessChallengeRepository } from './src/infrastructure/repositories/prisma-business-challenge.repository';
import { HttpTrainingServiceClient } from './src/infrastructure/clients/training-service-client';
import { HttpBusinessRegistryClient } from './src/infrastructure/clients/business-registry-client';
import { createPrismaClient } from '@shared/database/prisma-client';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { appLogger } from '../../shared/logger/logger';

let outboxProcessor: OutboxProcessor | null = null;
let prisma: PrismaClient;

class EventBusPublisher {
    constructor(private readonly bus: typeof eventBus) {}

    async publish(eventName: string, payload: any): Promise<void> {
        await this.bus.publish(eventName, payload);
    }
}

class PrismaThreadAnswerRepository {
    constructor(private readonly client: PrismaClient) {}

    async save(answer: any): Promise<any> {
        await this.client.community_ThreadAnswer.create({
            data: {
                id: answer.id,
                threadId: answer.threadId,
                authorId: answer.authorId,
                content: answer.content,
                qualityScore: answer.qualityScore,
                isAccepted: answer.isAccepted,
                createdAt: answer.createdAt
            }
        });
        return answer;
    }
}

class PrismaUserInteractionRepository {
    constructor(private readonly client: PrismaClient) {}

    async getRecentInteractions(userId: string, withinDays: number): Promise<Array<{
        contentId: string;
        contentType: string;
        category: string;
        timestamp: Date;
    }>> {
        const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
        const records = await this.client.community_UserInteraction.findMany({
            where: {
                userId,
                timestamp: { gte: cutoff }
            },
            orderBy: { timestamp: 'desc' }
        });
        return records.map(record => ({
            contentId: record.contentId,
            contentType: record.contentType,
            category: record.category,
            timestamp: record.timestamp
        }));
    }

    async logDiscovery(userId: string, contentIds: string[]): Promise<void> {
        if (!contentIds.length) {
            return;
        }

        await this.client.community_UserInteraction.createMany({
            data: contentIds.map(contentId => ({
                id: makeId(getModelPrefix('Community_UserInteraction')),
                userId,
                contentId,
                contentType: 'DISCOVERY',
                category: 'general',
                interactionType: 'DISCOVERY',
                timestamp: new Date()
            }))
        });
    }
}

class PrismaContentRepository {
    constructor(private readonly client: PrismaClient) {}

    async findAvailableContent(params?: {
        excludeIds?: string[];
        minQualityScore?: number;
        categories?: string[];
    }): Promise<Array<{
        id: string;
        type: 'THREAD' | 'ARTICLE' | 'CHALLENGE' | 'POST';
        title: string;
        category: string;
        industryTags: string[];
        expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
        qualityScore: number;
        engagementScore: number;
        createdAt: Date;
        wordCount: number;
    }>> {
        const minQuality = params?.minQualityScore ?? 0;
        const categories = params?.categories;
        const excludeIds = new Set(params?.excludeIds ?? []);

        const [articles, threads, challenges, posts] = await Promise.all([
            this.client.community_KnowledgeArticle.findMany({
                where: {
                    qualityScore: { gte: minQuality },
                    ...(categories ? { category: { in: categories } } : {})
                }
            }),
            this.client.community_DiscussionThread.findMany({
                where: categories ? { category: { in: categories } } : undefined
            }),
            this.client.community_BusinessChallenge.findMany({
                where: categories ? { category: { in: categories } } : undefined
            }),
            this.client.post.findMany({
                where: categories ? { tags: { hasSome: categories } } : undefined
            })
        ]);

        const normalizeWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

        const mappedArticles = articles.map(article => ({
            id: article.id,
            type: 'ARTICLE' as const,
            title: article.title,
            category: article.category,
            industryTags: article.industryTags,
            expertiseLevel: article.expertiseLevel as any,
            qualityScore: article.qualityScore,
            engagementScore: 0,
            createdAt: article.createdAt,
            wordCount: normalizeWordCount(article.summary || '') + normalizeWordCount(JSON.stringify(article.sections || ''))
        }));

        const mappedThreads = threads.map(thread => ({
            id: thread.id,
            type: 'THREAD' as const,
            title: thread.topic,
            category: thread.category,
            industryTags: [],
            expertiseLevel: thread.expertiseLevel as any,
            qualityScore: minQuality || 70,
            engagementScore: 0,
            createdAt: thread.createdAt,
            wordCount: normalizeWordCount(thread.content || '')
        }));

        const mappedChallenges = challenges.map(challenge => ({
            id: challenge.id,
            type: 'CHALLENGE' as const,
            title: challenge.title,
            category: challenge.category,
            industryTags: challenge.industryTags,
            expertiseLevel: 'ADVANCED' as const,
            qualityScore: minQuality || 70,
            engagementScore: 0,
            createdAt: challenge.createdAt,
            wordCount: normalizeWordCount(challenge.description || '')
        }));

        const mappedPosts = posts.map(post => ({
            id: post.id,
            type: 'POST' as const,
            title: post.title || 'Community Post',
            category: post.tags?.[0] || 'general',
            industryTags: post.tags || [],
            expertiseLevel: 'BEGINNER' as const,
            qualityScore: minQuality || 60,
            engagementScore: 0,
            createdAt: post.createdAt,
            wordCount: normalizeWordCount(post.content || '')
        }));

        return [...mappedArticles, ...mappedThreads, ...mappedChallenges, ...mappedPosts]
            .filter(item => !excludeIds.has(item.id))
            .filter(item => item.qualityScore >= minQuality);
    }
}

class PrismaExpertProfileProvider {
    constructor(private readonly client: PrismaClient) {}

    async getAvailableExperts(): Promise<Array<{
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
    }>> {
        const profiles = await this.client.community_BusinessProfile.findMany({
            where: { availableForMentorship: true }
        });

        return profiles.map(profile => {
            const expertiseAreas = Array.isArray(profile.expertiseAreas) ? profile.expertiseAreas : [];
            const normalized = expertiseAreas.map((area: any) => ({
                area: area.area || area,
                level: area.level || 'INTERMEDIATE'
            }));
            const topicScores = new Map<string, number>();
            normalized.forEach(item => topicScores.set(item.area, 0.6));

            return {
                userId: profile.userId,
                expertiseAreas: normalized,
                isAvailableForMentorship: profile.availableForMentorship ?? true,
                mentorshipCapacity: profile.mentorshipCapacity ?? 0,
                currentMentees: 0,
                responseHistory: {
                    totalResponses: 0,
                    acceptedAnswers: 0,
                    averageResponseTimeMinutes: 0
                },
                topicRelevanceScores: topicScores
            };
        });
    }
}

export const CommunityModule: Module = {
    name: 'community-service',
    initialize: async () => {
        appLogger.info('Initializing community-service module');

        prisma = createPrismaClient();

        const articleRepository = new PrismaKnowledgeArticleRepository(prisma);
        const profileRepository = new PrismaBusinessProfileRepository(prisma);
        const quotaRepository = new PrismaEngagementQuotaRepository(prisma);
        const threadRepository = new PrismaDiscussionThreadRepository(prisma);
        const challengeRepository = new PrismaBusinessChallengeRepository(prisma);
        const answerRepository = new PrismaThreadAnswerRepository(prisma);

        const eventPublisher = new EventBusPublisher(eventBus);
        const expertProvider = new PrismaExpertProfileProvider(prisma);
        const trainingServiceClient = new HttpTrainingServiceClient();
        const businessRegistryClient = new HttpBusinessRegistryClient();

        const submitArticleUseCase = new SubmitKnowledgeArticleUseCase(
            articleRepository,
            profileRepository as any,
            quotaRepository as any,
            eventPublisher
        );
        const createThreadUseCase = new CreateDiscussionThreadUseCase(
            threadRepository,
            quotaRepository as any,
            profileRepository as any,
            expertProvider as any,
            eventPublisher
        );
        const answerQuestionUseCase = new AnswerQuestionUseCase(
            threadRepository as any,
            answerRepository as any,
            profileRepository as any,
            eventPublisher
        );
        const proposeChallengeUseCase = new ProposeBusinessChallengeUseCase(
            challengeRepository,
            profileRepository as any,
            quotaRepository as any,
            expertProvider as any,
            eventPublisher
        );
        const validateExpertiseUseCase = new ValidateExpertiseUseCase(
            profileRepository as any,
            trainingServiceClient,
            businessRegistryClient,
            eventPublisher
        );
        const discoverContentUseCase = new DiscoverContentUseCase(
            profileRepository as any,
            new PrismaContentRepository(prisma) as any,
            new PrismaUserInteractionRepository(prisma) as any
        );

        const knowledgeController = new KnowledgeController(submitArticleUseCase);
        const communityController = new CommunityController(
            proposeChallengeUseCase,
            validateExpertiseUseCase,
            discoverContentUseCase
        );
        const discussionsController = new DiscussionsController(createThreadUseCase, answerQuestionUseCase);

        try {
            const outbox = new TransactionalOutbox(prisma, 'outboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'community-service');
            outboxProcessor.start();
            appLogger.info('Community-service outbox processor started');
        } catch (e) {
            appLogger.error('Failed to start community-service outbox processor', { error: e instanceof Error ? e.message : String(e) });
        }

        const commRouter = CommunityModule.routes!;
        commRouter.get('/health', (_req, res) => {
            res.json({ status: 'healthy', service: 'community-service', timestamp: new Date().toISOString() });
        });

        commRouter.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        commRouter.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(prisma));
        commRouter.use('/knowledge', createKnowledgeRouter(knowledgeController as never));
        commRouter.use('/', createCommunityRouter(communityController as never));
        commRouter.use('/discussions', createDiscussionsRouter(discussionsController as never));
        commRouter.use('/posts', postsRoutes);
    },
    routes: Router(),
    shutdown: async () => {
        appLogger.info('Shutting down community-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};
