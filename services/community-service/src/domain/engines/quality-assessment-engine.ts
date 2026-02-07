export interface QualitySignals {
    clarity: number; // 0-100
    actionability: number; // 0-100
    businessRelevance: number; // 0-100
    evidenceQuality: number; // 0-100
    structureQuality: number; // 0-100
}

export interface ContentAnalysis {
    text: string;
    hasExamples: boolean;
    hasData: boolean;
    hasStructuredSections: boolean;
    readabilityScore: number;
    uniquenessScore: number;
}

export interface EngagementMetrics {
    views: number;
    thoughtfulComments: number;
    genericReactions: number;
    expertEndorsements: number;
    peerUpvotes: number;
}

export interface QualityScore {
    overall: number;
    signals: QualitySignals;
    confidence: number;
    recommendations: string[];
}

export class QualityAssessmentEngine {
    static assessContent(params: {
        content: ContentAnalysis;
        engagement: EngagementMetrics;
        authorReputation: number;
    }): QualityScore {
        const signals: QualitySignals = {
            clarity: this.assessClarity(params.content),
            actionability: this.assessActionability(params.content),
            businessRelevance: this.assessBusinessRelevance(params.content),
            evidenceQuality: this.assessEvidence(params.content),
            structureQuality: this.assessStructure(params.content),
        };

        // Weight the signals
        const weights = {
            clarity: 0.25,
            actionability: 0.25,
            businessRelevance: 0.20,
            evidenceQuality: 0.15,
            structureQuality: 0.15,
        };

        let overallScore = 0;
        overallScore += signals.clarity * weights.clarity;
        overallScore += signals.actionability * weights.actionability;
        overallScore += signals.businessRelevance * weights.businessRelevance;
        overallScore += signals.evidenceQuality * weights.evidenceQuality;
        overallScore += signals.structureQuality * weights.structureQuality;

        // Apply engagement bonuses
        const engagementScore = this.calculateEngagementQuality(params.engagement);
        overallScore = overallScore * 0.7 + engagementScore * 0.3;

        // Calculate confidence
        const confidence = this.calculateConfidence(params);

        // Generate recommendations
        const recommendations = this.generateRecommendations(signals);

        return {
            overall: Math.round(overallScore),
            signals,
            confidence,
            recommendations,
        };
    }

    private static assessClarity(content: ContentAnalysis): number {
        let score = 50; // Base score

        // Readability score (0-100)
        score += content.readabilityScore * 0.3;

        // Well-structured content
        if (content.hasStructuredSections) {
            score += 20;
        }

        // Length considerations
        const wordCount = content.text.split(/\s+/).length;
        if (wordCount >= 50 && wordCount <= 500) {
            score += 10; // Optimal length
        } else if (wordCount < 20) {
            score -= 20; // Too short
        }

        // Check for clear language indicators
        const clarityIndicators = ['specifically', 'for example', 'in other words', 'to clarify', 'meaning'];
        const hasClarityIndicators = clarityIndicators.some(indicator =>
            content.text.toLowerCase().includes(indicator)
        );
        if (hasClarityIndicators) {
            score += 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private static assessActionability(content: ContentAnalysis): number {
        let score = 40; // Base score

        // Action-oriented keywords
        const actionKeywords = [
            'how to', 'steps', 'implement', 'apply', 'use', 'create',
            'build', 'develop', 'strategy', 'approach', 'method', 'technique'
        ];

        const actionCount = actionKeywords.filter(keyword =>
            content.text.toLowerCase().includes(keyword)
        ).length;

        score += Math.min(actionCount * 10, 30);

        // Concrete examples
        if (content.hasExamples) {
            score += 20;
        }

        // Numbered lists or bullets suggest action steps
        if (/\d+\.|•|→/.test(content.text)) {
            score += 15;
        }

        // Data and metrics make it more actionable
        if (content.hasData) {
            score += 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private static assessBusinessRelevance(content: ContentAnalysis): number {
        let score = 40; // Base score

        // Business keywords
        const businessKeywords = [
            'revenue', 'customer', 'market', 'growth', 'profit', 'cost',
            'strategy', 'competitive', 'business', 'ROI', 'efficiency', 'operations',
            'sales', 'marketing', 'supply chain', 'finance', 'logistics'
        ];

        const keywordMatches = businessKeywords.filter(keyword =>
            content.text.toLowerCase().includes(keyword)
        ).length;

        score += Math.min(keywordMatches * 8, 40);

        // Real-world examples
        if (content.hasExamples) {
            score += 15;
        }

        // Metrics and data points
        if (content.hasData) {
            score += 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private static assessEvidence(content: ContentAnalysis): number {
        let score = 30; // Base score

        // Examples provide evidence
        if (content.hasExamples) {
            score += 25;
        }

        // Data and metrics as evidence
        if (content.hasData) {
            score += 25;
        }

        // Citations or references
        if (/\bcite\b|\bsource\b|\baccording to\b|\bresearch shows\b/i.test(content.text)) {
            score += 15;
        }

        // Case studies or scenarios
        if (/\bcase study\b|\bscenario\b|\bin practice\b/i.test(content.text)) {
            score += 15;
        }

        // Personal experience indicators
        if (/\bI have\b|\bwe found\b|\bin my experience\b/i.test(content.text)) {
            score += 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private static assessStructure(content: ContentAnalysis): number {
        let score = 40; // Base score

        // Has structured sections
        if (content.hasStructuredSections) {
            score += 30;
        }

        // Paragraphs (not a wall of text)
        const paragraphs = content.text.split(/\n\n+/).length;
        if (paragraphs >= 2 && paragraphs <= 10) {
            score += 15;
        }

        // Headers or sections
        if (/^#+\s/m.test(content.text) || /\n[A-Z][^.!?]+:\n/m.test(content.text)) {
            score += 15;
        }

        // Lists (ordered or unordered)
        if (/(\d+\.|\*)[\s]/g.test(content.text)) {
            score += 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private static calculateEngagementQuality(engagement: EngagementMetrics): number {
        let score = 0;

        // Expert endorsements are highest value
        score += Math.min(engagement.expertEndorsements * 15, 40);

        // Thoughtful comments over generic reactions
        const commentRatio = engagement.thoughtfulComments / Math.max(engagement.genericReactions, 1);
        if (commentRatio > 0.5) {
            score += 20;
        } else if (commentRatio > 0.2) {
            score += 10;
        }

        // Peer upvotes
        score += Math.min(engagement.peerUpvotes * 2, 20);

        // View count (engagement interest)
        if (engagement.views > 100) {
            score += 10;
        } else if (engagement.views > 50) {
            score += 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    private static calculateConfidence(params: {
        content: ContentAnalysis;
        engagement: EngagementMetrics;
        authorReputation: number;
    }): number {
        let confidence = 0.5; // Base confidence

        // More data = higher confidence
        const hasRichContent = params.content.hasExamples && params.content.hasData;
        if (hasRichContent) {
            confidence += 0.2;
        }

        // Engagement signals increase confidence
        const totalEngagement = params.engagement.thoughtfulComments +
            params.engagement.expertEndorsements +
            params.engagement.peerUpvotes;

        if (totalEngagement > 10) {
            confidence += 0.2;
        } else if (totalEngagement > 5) {
            confidence += 0.1;
        }

        // Author reputation
        if (params.authorReputation > 2000) {
            confidence += 0.15;
        } else if (params.authorReputation > 500) {
            confidence += 0.1;
        }

        return Math.min(1, confidence);
    }

    private static generateRecommendations(signals: QualitySignals): string[] {
        const recommendations: string[] = [];

        if (signals.clarity < 60) {
            recommendations.push('Improve clarity by breaking down complex ideas into simpler terms');
        }

        if (signals.actionability < 60) {
            recommendations.push('Add concrete steps or examples showing how to apply this knowledge');
        }

        if (signals.businessRelevance < 60) {
            recommendations.push('Connect the topic to specific business outcomes or metrics');
        }

        if (signals.evidenceQuality < 60) {
            recommendations.push('Support claims with examples, data, or real-world cases');
        }

        if (signals.structureQuality < 60) {
            recommendations.push('Organize content with clear sections, headings, or bullet points');
        }

        return recommendations;
    }

    static assessPeerReview(params: {
        reviewScore: number;
        reviewerExpertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'MENTOR';
        reviewFeedback: string;
    }): { weight: number; credibility: number } {
        const expertiseLevelWeights = {
            BEGINNER: 0.5,
            INTERMEDIATE: 0.7,
            EXPERT: 1.0,
            MENTOR: 1.2,
        };

        const weight = expertiseLevelWeights[params.reviewerExpertiseLevel];

        // Assess credibility of review based on feedback quality
        const feedbackLength = params.reviewFeedback.length;
        const hasConstructiveFeedback = /\b(suggest|improve|consider|recommend)\b/i.test(params.reviewFeedback);
        const hasSpecificExamples = /\b(example|instance|specifically|such as)\b/i.test(params.reviewFeedback);

        let credibility = 0.5;
        if (feedbackLength > 100) credibility += 0.2;
        if (hasConstructiveFeedback) credibility += 0.2;
        if (hasSpecificExamples) credibility += 0.1;

        return {
            weight,
            credibility: Math.min(1, credibility),
        };
    }

    static aggregatePeerReviews(reviews: Array<{
        score: number;
        expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'MENTOR';
        feedback: string;
    }>): number {
        if (reviews.length === 0) return 0;

        let weightedSum = 0;
        let totalWeight = 0;

        for (const review of reviews) {
            const assessment = this.assessPeerReview({
                reviewScore: review.score,
                reviewerExpertiseLevel: review.expertiseLevel,
                reviewFeedback: review.feedback,
            });

            const effectiveWeight = assessment.weight * assessment.credibility;
            weightedSum += review.score * effectiveWeight;
            totalWeight += effectiveWeight;
        }

        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }
}
