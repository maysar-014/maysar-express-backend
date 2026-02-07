import { ExpertiseArea } from '../entities/business-profile.entity';

export interface ExpertMatch {
    userId: string;
    expertiseArea: string;
    expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'MENTOR';
    matchConfidence: number;
    matchReasons: string[];
    isAvailable: boolean;
    responseRate: number;
    averageResponseTime: number;
}

export interface ThreadMatchingRequest {
    topic: string;
    category: string;
    expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    industryTags: string[];
}

export interface ExpertProfile {
    userId: string;
    expertiseAreas: ExpertiseArea[];
    isAvailableForMentorship: boolean;
    mentorshipCapacity: number;
    currentMentees: number;
    responseHistory: {
        totalResponses: number;
        acceptedAnswers: number;
        averageResponseTimeMinutes: number;
    };
    topicRelevanceScores: Map<string, number>;
}

export class DiscussionMatchingEngine {
    private static readonly MIN_CONFIDENCE_THRESHOLD = 0.6;
    private static readonly MAX_MATCHES = 10;

    static matchExpertsToThread(
        request: ThreadMatchingRequest,
        availableExperts: ExpertProfile[]
    ): ExpertMatch[] {
        const matches: ExpertMatch[] = [];

        for (const expert of availableExperts) {
            const match = this.evaluateExpertMatch(request, expert);

            if (match.matchConfidence >= this.MIN_CONFIDENCE_THRESHOLD) {
                matches.push(match);
            }
        }

        // Sort by confidence score and workload balance
        return matches
            .sort((a, b) => this.compareMatches(a, b))
            .slice(0, this.MAX_MATCHES);
    }

    private static evaluateExpertMatch(
        request: ThreadMatchingRequest,
        expert: ExpertProfile
    ): ExpertMatch {
        const matchReasons: string[] = [];
        let confidenceScore = 0;

        // Check expertise area relevance
        const relevantExpertise = expert.expertiseAreas.find(area =>
            this.isExpertiseRelevant(area.area, request.category, request.industryTags)
        );

        if (!relevantExpertise) {
            return {
                userId: expert.userId,
                expertiseArea: '',
                expertiseLevel: 'BEGINNER',
                matchConfidence: 0,
                matchReasons: ['No relevant expertise'],
                isAvailable: false,
                responseRate: 0,
                averageResponseTime: 0,
            };
        }

        // Expertise level matching (30% weight)
        const levelScore = this.calculateLevelScore(request.expertiseLevel, relevantExpertise.level);
        confidenceScore += levelScore * 0.3;
        if (levelScore > 0.7) {
            matchReasons.push('Appropriate expertise level');
        }

        // Topic relevance (25% weight)
        const topicScore = expert.topicRelevanceScores?.get(request.topic) || 0.5;
        confidenceScore += topicScore * 0.25;
        if (topicScore > 0.7) {
            matchReasons.push('High topic relevance');
        }

        // Response history (20% weight)
        const responseRate = expert.responseHistory.totalResponses > 0
            ? expert.responseHistory.acceptedAnswers / expert.responseHistory.totalResponses
            : 0.5;
        confidenceScore += responseRate * 0.2;
        if (responseRate > 0.7) {
            matchReasons.push('Strong answer acceptance rate');
        }

        // Availability (15% weight)
        const availabilityScore = this.calculateAvailabilityScore(expert);
        confidenceScore += availabilityScore * 0.15;
        if (availabilityScore > 0.8) {
            matchReasons.push('Available for mentorship');
        }

        // Response time (10% weight)
        const responseTimeScore = this.calculateResponseTimeScore(
            expert.responseHistory.averageResponseTimeMinutes
        );
        confidenceScore += responseTimeScore * 0.1;
        if (responseTimeScore > 0.8) {
            matchReasons.push('Fast response time');
        }

        return {
            userId: expert.userId,
            expertiseArea: relevantExpertise.area,
            expertiseLevel: relevantExpertise.level,
            matchConfidence: Math.min(1, confidenceScore),
            matchReasons,
            isAvailable: expert.isAvailableForMentorship && expert.currentMentees < expert.mentorshipCapacity,
            responseRate,
            averageResponseTime: expert.responseHistory.averageResponseTimeMinutes,
        };
    }

    private static isExpertiseRelevant(
        expertiseArea: string,
        category: string,
        industryTags: string[]
    ): boolean {
        // Direct category match
        if (expertiseArea.toLowerCase() === category.toLowerCase()) {
            return true;
        }

        // Industry tag match
        if (industryTags.some(tag => tag.toLowerCase() === expertiseArea.toLowerCase())) {
            return true;
        }

        // Partial match (e.g., "Digital Marketing" matches "Marketing")
        if (expertiseArea.toLowerCase().includes(category.toLowerCase()) ||
            category.toLowerCase().includes(expertiseArea.toLowerCase())) {
            return true;
        }

        return false;
    }

    private static calculateLevelScore(
        requiredLevel: string,
        expertLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'MENTOR'
    ): number {
        const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
        const expertLevels = ['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'MENTOR'];

        const requiredIndex = levels.indexOf(requiredLevel);
        const expertIndex = expertLevels.indexOf(expertLevel);

        // Perfect match
        if (requiredLevel === expertLevel ||
            (requiredLevel === 'ADVANCED' && expertIndex >= 2)) {
            return 1.0;
        }

        // Expert/Mentor can answer all levels
        if (expertIndex >= 2) {
            return 0.9;
        }

        // One level difference
        if (Math.abs(requiredIndex - expertIndex) === 1) {
            return 0.7;
        }

        // Two levels difference
        if (Math.abs(requiredIndex - expertIndex) === 2) {
            return 0.4;
        }

        return 0.2;
    }

    private static calculateAvailabilityScore(expert: ExpertProfile): number {
        if (!expert.isAvailableForMentorship) {
            return 0.3; // Can still answer questions, just not formally mentoring
        }

        const capacityUtilization = expert.currentMentees / Math.max(expert.mentorshipCapacity, 1);

        // Better score for experts with available capacity
        return Math.max(0, 1 - capacityUtilization);
    }

    private static calculateResponseTimeScore(averageMinutes: number): number {
        // Excellent: < 30 minutes
        if (averageMinutes < 30) return 1.0;

        // Good: < 2 hours
        if (averageMinutes < 120) return 0.8;

        // Fair: < 24 hours
        if (averageMinutes < 1440) return 0.6;

        // Slow: < 3 days
        if (averageMinutes < 4320) return 0.4;

        // Very slow: > 3 days
        return 0.2;
    }

    private static compareMatches(a: ExpertMatch, b: ExpertMatch): number {
        // Primary sort: confidence score
        if (Math.abs(a.matchConfidence - b.matchConfidence) > 0.1) {
            return b.matchConfidence - a.matchConfidence;
        }

        // Secondary sort: availability
        if (a.isAvailable !== b.isAvailable) {
            return a.isAvailable ? -1 : 1;
        }

        // Tertiary sort: response rate
        return b.responseRate - a.responseRate;
    }

    static prioritizeForBeginners(matches: ExpertMatch[]): ExpertMatch[] {
        // For beginner questions, prioritize mentors who are available
        return matches.sort((a, b) => {
            const aIsMentor = a.expertiseLevel === 'MENTOR';
            const bIsMentor = b.expertiseLevel === 'MENTOR';

            if (aIsMentor !== bIsMentor) {
                return aIsMentor ? -1 : 1;
            }

            return b.matchConfidence - a.matchConfidence;
        });
    }

    static balanceExpertWorkload(
        matches: ExpertMatch[],
        expertWorkloads: Map<string, number>
    ): ExpertMatch[] {
        // Reorder matches to balance workload
        return matches.sort((a, b) => {
            const aWorkload = expertWorkloads.get(a.userId) || 0;
            const bWorkload = expertWorkloads.get(b.userId) || 0;

            // If confidence is similar, prefer lower workload
            if (Math.abs(a.matchConfidence - b.matchConfidence) < 0.2) {
                return aWorkload - bWorkload;
            }

            // Otherwise, prioritize confidence
            return b.matchConfidence - a.matchConfidence;
        });
    }
}
