export interface KnowledgeArticleDTO {
    id: string;
    authorId: string;
    title: string;
    summary: string;
    sections: Array<{
        heading: string;
        content: string;
        order: number;
    }>;
    category: string;
    industryTags: string[];
    expertiseLevel: string;
    reviewStatus: string;
    qualityScore: number;
    version: number;
    trainingModuleId?: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BusinessChallengeDTO {
    id: string;
    proposerId: string;
    title: string;
    description: string;
    category: string;
    industryTags: string[];
    constraints: string[];
    successCriteria: Array<{
        description: string;
        measurable: boolean;
        targetValue?: string;
    }>;
    status: string;
    deadline?: string;
    acceptedSolutionId?: string;
    collaborators: string[];
    createdAt: string;
    updatedAt: string;
    solvedAt?: string;
}

export interface ContentRecommendationDTO {
    contentId: string;
    contentType: string;
    title: string;
    category: string;
    relevanceScore: number;
    recommendationReasons: string[];
    estimatedReadTime: number;
}
