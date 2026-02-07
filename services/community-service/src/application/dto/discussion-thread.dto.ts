export interface DiscussionThreadDTO {
    id: string;
    authorId: string;
    topic: string;
    content: string;
    category: string;
    status: string;
    expertiseLevel: string;
    businessContext: {
        industry: string[];
        businessStage: string;
        tags: string[];
    };
    maxResponsesPerUser: number;
    acceptedAnswerId?: string;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDiscussionThreadDTO {
    topic: string;
    content: string;
    category: string;
    expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    industry: string[];
    businessStage: string;
    tags: string[];
    maxResponsesPerUser?: number;
}

export interface ThreadAnswerDTO {
    id: string;
    threadId: string;
    authorId: string;
    content: string;
    qualityScore: number;
    isAccepted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BusinessProfileDTO {
    id: string;
    userId: string;
    businessId?: string;
    expertiseAreas: Array<{
        area: string;
        level: string;
        verifiedAt?: string;
    }>;
    industryExperience: string[];
    certifications: string[];
    contributionScore: number;
    contributionMetrics: {
        helpfulAnswers: number;
        knowledgeShared: number;
        mentorshipHours: number;
        articlesPublished: number;
        challengesSolved: number;
    };
    reputationTier: string;
    businessGoals: Array<{
        description: string;
        targetDate?: string;
        category: string;
    }>;
    learningObjectives: Array<{
        topic: string;
        priority: string;
        targetCompletionDate?: string;
    }>;
    availableForMentorship: boolean;
    mentorshipCapacity: number;
    createdAt: string;
    updatedAt: string;
}
