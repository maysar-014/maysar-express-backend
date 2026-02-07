import { KnowledgeDiscoveryEngine, ContentRecommendation, UserContext } from '../../domain/engines/knowledge-discovery-engine';

export interface DiscoverContentRequest {
    userId: string;
    sessionType?: 'daily' | 'weekly' | 'ondemand';
    maxResults?: number;
}

export interface DiscoverContentResponse {
    recommendations: ContentRecommendation[];
    totalAvailable: number;
    sessionType: string;
}

export interface BusinessProfileRepository {
    findByUserId(userId: string): Promise<{
        id: string;
        userId: string;
        businessGoals: Array<{ description: string; category: string; priority: string }>;
        learningObjectives: Array<{ topic: string; priority: string; targetCompletionDate?: Date }>;
        expertiseAreas: string[];
        industryExperience: string[];
    } | null>;
}

export interface ContentRepository {
    findAvailableContent(params?: {
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
    }>>;
}

export interface UserInteractionRepository {
    getRecentInteractions(userId: string, withinDays: number): Promise<Array<{
        contentId: string;
        contentType: string;
        category: string;
        timestamp: Date;
    }>>;
    logDiscovery(userId: string, contentIds: string[]): Promise<void>;
}

export class DiscoverContentUseCase {
    constructor(
        private readonly profileRepository: BusinessProfileRepository,
        private readonly contentRepository: ContentRepository,
        private readonly interactionRepository: UserInteractionRepository
    ) { }

    async execute(request: DiscoverContentRequest): Promise<DiscoverContentResponse> {
        // 1. Get user's business profile and preferences
        const profile = await this.profileRepository.findByUserId(request.userId);
        if (!profile) {
            throw new Error('User business profile not found');
        }

        // 2. Get recent interactions to avoid recommending already-viewed content
        const recentInteractions = await this.interactionRepository.getRecentInteractions(
            request.userId,
            30 // Last 30 days
        );

        // 3. Build user context
        const userContext: UserContext = {
            userId: request.userId,
            businessGoals: profile.businessGoals.map(g => ({
                description: g.description,
                category: g.category,
                priority: g.priority as 'LOW' | 'MEDIUM' | 'HIGH',
            })),
            learningObjectives: profile.learningObjectives.map(o => ({
                topic: o.topic,
                priority: o.priority as 'LOW' | 'MEDIUM' | 'HIGH',
                targetCompletionDate: o.targetCompletionDate,
            })),
            expertiseAreas: profile.expertiseAreas,
            industryExperience: profile.industryExperience,
            recentInteractions,
        };

        // 4. Get available content (excluding low quality)
        const availableContent = await this.contentRepository.findAvailableContent({
            excludeIds: recentInteractions.map(i => i.contentId),
            minQualityScore: 60,
        });

        // 5. Use discovery engine to get personalized recommendations
        const sessionType = request.sessionType || 'daily';
        const recommendations = KnowledgeDiscoveryEngine.discoverContent(
            userContext,
            availableContent,
            sessionType
        );

        // 6. Apply max results limit if specified
        const finalRecommendations = request.maxResults
            ? recommendations.slice(0, request.maxResults)
            : recommendations;

        // 7. Log discovery for analytics
        await this.interactionRepository.logDiscovery(
            request.userId,
            finalRecommendations.map(r => r.contentId)
        );

        return {
            recommendations: finalRecommendations,
            totalAvailable: availableContent.length,
            sessionType,
        };
    }
}
