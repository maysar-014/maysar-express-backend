export interface BusinessGoal {
    description: string;
    category: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LearningObjective {
    topic: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    targetCompletionDate?: Date;
}

export interface ContentRecommendation {
    contentId: string;
    contentType: 'THREAD' | 'ARTICLE' | 'CHALLENGE' | 'POST';
    title: string;
    category: string;
    relevanceScore: number;
    recommendationReasons: string[];
    estimatedReadTime: number;
}

export interface UserContext {
    userId: string;
    businessGoals: BusinessGoal[];
    learningObjectives: LearningObjective[];
    expertiseAreas: string[];
    industryExperience: string[];
    recentInteractions: {
        contentId: string;
        contentType: string;
        category: string;
        timestamp: Date;
    }[];
}

export interface AvailableContent {
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
}

export class KnowledgeDiscoveryEngine {
    private static readonly MAX_RECOMMENDATIONS = 5;
    private static readonly MIN_QUALITY_THRESHOLD = 60;
    private static readonly RECENCY_WEIGHT = 0.15;
    private static readonly RELEVANCE_WEIGHT = 0.40;
    private static readonly QUALITY_WEIGHT = 0.25;
    private static readonly ENGAGEMENT_WEIGHT = 0.20;

    static discoverContent(
        userContext: UserContext,
        availableContent: AvailableContent[],
        sessionType: 'daily' | 'weekly' | 'ondemand' = 'daily'
    ): ContentRecommendation[] {
        // Filter out low-quality content
        const qualityContent = availableContent.filter(
            content => content.qualityScore >= this.MIN_QUALITY_THRESHOLD
        );

        // Filter out recently viewed content
        const unseenContent = this.filterRecentlyViewed(qualityContent, userContext.recentInteractions);

        // Calculate relevance scores
        const scoredContent = unseenContent.map(content => ({
            content,
            score: this.calculateRelevanceScore(content, userContext),
            reasons: this.getRecommendationReasons(content, userContext),
        }));

        // Sort by score and select top items
        const sorted = scoredContent.sort((a, b) => b.score - a.score);

        const limit = sessionType === 'daily' ? 5 : sessionType === 'weekly' ? 10 : this.MAX_RECOMMENDATIONS;
        const topRecommendations = sorted.slice(0, limit);

        // Convert to recommendations
        return topRecommendations.map(item => ({
            contentId: item.content.id,
            contentType: item.content.type,
            title: item.content.title,
            category: item.content.category,
            relevanceScore: item.score,
            recommendationReasons: item.reasons,
            estimatedReadTime: this.calculateReadTime(item.content.wordCount),
        }));
    }

    private static calculateRelevanceScore(
        content: AvailableContent,
        userContext: UserContext
    ): number {
        let score = 0;

        // Relevance to business goals (40% weight)
        const goalRelevance = this.calculateGoalRelevance(content, userContext.businessGoals);
        score += goalRelevance * this.RELEVANCE_WEIGHT;

        // Relevance to learning objectives (40% weight - shared with goals)
        const learningRelevance = this.calculateLearningRelevance(
            content,
            userContext.learningObjectives
        );
        score += learningRelevance * this.RELEVANCE_WEIGHT;

        // Content quality (25% weight)
        const qualityScore = content.qualityScore / 100;
        score += qualityScore * this.QUALITY_WEIGHT;

        // Engagement potential (20% weight)
        const engagementScore = content.engagementScore / 100;
        score += engagementScore * this.ENGAGEMENT_WEIGHT;

        // Recency bonus (15% weight)
        const recencyScore = this.calculateRecencyScore(content.createdAt);
        score += recencyScore * this.RECENCY_WEIGHT;

        return Math.min(1, score);
    }

    private static calculateGoalRelevance(
        content: AvailableContent,
        goals: BusinessGoal[]
    ): number {
        if (goals.length === 0) return 0.5; // Neutral if no goals set

        let maxRelevance = 0;

        for (const goal of goals) {
            let relevance = 0;

            // Category match
            if (content.category.toLowerCase() === goal.category.toLowerCase()) {
                relevance += 0.6;
            }

            // Partial match
            if (content.category.toLowerCase().includes(goal.category.toLowerCase()) ||
                goal.category.toLowerCase().includes(content.category.toLowerCase())) {
                relevance = Math.max(relevance, 0.4);
            }

            // Priority bonus
            const priorityBonus = goal.priority === 'HIGH' ? 0.3 :
                goal.priority === 'MEDIUM' ? 0.2 : 0.1;
            relevance += priorityBonus;

            // Industry tag match
            if (content.industryTags.some(tag => goal.description.toLowerCase().includes(tag.toLowerCase()))) {
                relevance += 0.2;
            }

            maxRelevance = Math.max(maxRelevance, Math.min(1, relevance));
        }

        return maxRelevance;
    }

    private static calculateLearningRelevance(
        content: AvailableContent,
        objectives: LearningObjective[]
    ): number {
        if (objectives.length === 0) return 0.5; // Neutral if no objectives set

        let maxRelevance = 0;

        for (const objective of objectives) {
            let relevance = 0;

            // Topic match
            if (content.title.toLowerCase().includes(objective.topic.toLowerCase()) ||
                content.category.toLowerCase().includes(objective.topic.toLowerCase())) {
                relevance += 0.7;
            }

            // Expertise level alignment
            const levelAlignment = this.calculateExpertiseLevelAlignment(
                objective.priority,
                content.expertiseLevel
            );
            relevance += levelAlignment * 0.3;

            // Priority bonus
            const priorityBonus = objective.priority === 'HIGH' ? 0.3 :
                objective.priority === 'MEDIUM' ? 0.2 : 0.1;
            relevance += priorityBonus;

            // Urgency bonus (if target date is soon)
            if (objective.targetCompletionDate) {
                const daysUntilTarget = Math.floor(
                    (objective.targetCompletionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysUntilTarget < 30 && daysUntilTarget > 0) {
                    relevance += 0.2;
                }
            }

            maxRelevance = Math.max(maxRelevance, Math.min(1, relevance));
        }

        return maxRelevance;
    }

    private static calculateExpertiseLevelAlignment(
        priority: 'LOW' | 'MEDIUM' | 'HIGH',
        contentLevel: string
    ): number {
        // High priority objectives suggest user wants expert-level content
        if (priority === 'HIGH') {
            return contentLevel === 'EXPERT' || contentLevel === 'ADVANCED' ? 1.0 : 0.7;
        }

        // Medium priority suggests intermediate content
        if (priority === 'MEDIUM') {
            return contentLevel === 'INTERMEDIATE' || contentLevel === 'ADVANCED' ? 1.0 : 0.6;
        }

        // Low priority suggests beginner content
        return contentLevel === 'BEGINNER' || contentLevel === 'INTERMEDIATE' ? 1.0 : 0.5;
    }

    private static calculateRecencyScore(createdAt: Date): number {
        const daysSinceCreation = Math.floor(
            (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Bonus for very recent content (< 7 days)
        if (daysSinceCreation < 7) return 1.0;

        // Good recency (< 30 days)
        if (daysSinceCreation < 30) return 0.8;

        // Moderate recency (< 90 days)
        if (daysSinceCreation < 90) return 0.6;

        // Older content
        if (daysSinceCreation < 180) return 0.4;

        // Old content
        return 0.2;
    }

    private static filterRecentlyViewed(
        content: AvailableContent[],
        recentInteractions: UserContext['recentInteractions']
    ): AvailableContent[] {
        const recentIds = new Set(recentInteractions.map(i => i.contentId));
        return content.filter(c => !recentIds.has(c.id));
    }

    private static getRecommendationReasons(
        content: AvailableContent,
        userContext: UserContext
    ): string[] {
        const reasons: string[] = [];
        const contentCategory = typeof content.category === 'string' ? content.category.toLowerCase() : '';
        const contentTitle = typeof content.title === 'string' ? content.title.toLowerCase() : '';

        // Business goal alignment
        const matchingGoals = userContext.businessGoals.filter(goal =>
            typeof goal?.category === 'string' && contentCategory.includes(goal.category.toLowerCase())
        );
        if (matchingGoals.length > 0) {
            reasons.push(`Aligns with your ${matchingGoals[0].category} goals`);
        }

        // Learning objective alignment
        const matchingObjectives = userContext.learningObjectives.filter(obj =>
            typeof obj?.topic === 'string' && (
                contentTitle.includes(obj.topic.toLowerCase()) ||
                contentCategory.includes(obj.topic.toLowerCase())
            )
        );
        if (matchingObjectives.length > 0) {
            reasons.push(`Part of your ${matchingObjectives[0].topic} learning path`);
        }

        // Expertise area match
        const expertiseAreas = Array.isArray(userContext.expertiseAreas)
            ? userContext.expertiseAreas.filter((area): area is string => typeof area === 'string')
            : [];
        if (expertiseAreas.some(area => contentCategory.includes(area.toLowerCase()))) {
            reasons.push('Matches your expertise areas');
        }

        // High quality
        if (content.qualityScore >= 80) {
            reasons.push('High-quality content');
        }

        // High engagement
        if (content.engagementScore >= 80) {
            reasons.push('Popular discussion');
        }

        // Recent
        const daysSinceCreation = Math.floor(
            (new Date().getTime() - content.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreation < 7) {
            reasons.push('Recently published');
        }

        return reasons.slice(0, 3); // Return top 3 reasons
    }

    private static calculateReadTime(wordCount: number): number {
        // Assume 200 words per minute reading speed
        return Math.ceil(wordCount / 200);
    }

    static createLearningPath(
        userContext: UserContext,
        allContent: AvailableContent[]
    ): ContentRecommendation[] {
        // Group content by category and expertise level
        const pathContent: ContentRecommendation[] = [];

        for (const objective of userContext.learningObjectives) {
            const relevantContent = allContent.filter(content =>
                content.category.toLowerCase().includes(objective.topic.toLowerCase()) ||
                content.title.toLowerCase().includes(objective.topic.toLowerCase())
            );

            // Sort by expertise level (beginner to expert)
            const sortedByLevel = relevantContent.sort((a, b) => {
                const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
                return levels.indexOf(a.expertiseLevel) - levels.indexOf(b.expertiseLevel);
            });

            // Add top 2 from each level
            const recommendations = sortedByLevel.slice(0, 2).map(content => ({
                contentId: content.id,
                contentType: content.type,
                title: content.title,
                category: content.category,
                relevanceScore: this.calculateRelevanceScore(content, userContext),
                recommendationReasons: [`Part of ${objective.topic} learning path`],
                estimatedReadTime: this.calculateReadTime(content.wordCount),
            }));

            pathContent.push(...recommendations);
        }

        return pathContent;
    }
}
