import { DiscussionThread } from '../../domain/entities/discussion-thread.entity';
import { ContributionScore } from '../../domain/value-objects/contribution-score.value-object';
import { BusinessProfile } from '../../domain/entities/business-profile.entity';

export interface AnswerQuestionRequest {
    threadId: string;
    answerId: string;
    answererUserId: string;
    content: string;
}

export interface AnswerQuestionResponse {
    answerId: string;
    threadId: string;
    contributionPoints: number;
    qualityScore: number;
}

export interface ThreadAnswer {
    id: string;
    threadId: string;
    authorId: string;
    content: string;
    qualityScore: number;
    isAccepted: boolean;
    createdAt: Date;
}

export interface DiscussionThreadRepository {
    findById(id: string): Promise<DiscussionThread | null>;
    save(thread: DiscussionThread): Promise<DiscussionThread>;
    getUserResponseCount(threadId: string, userId: string): Promise<number>;
}

export interface ThreadAnswerRepository {
    save(answer: ThreadAnswer): Promise<ThreadAnswer>;
}

export interface BusinessProfileRepository {
    findByUserId(userId: string): Promise<BusinessProfile | null>;
    save(profile: BusinessProfile): Promise<BusinessProfile>;
}

export interface EventPublisher {
    publish(eventName: string, payload: any): Promise<void>;
}

export class AnswerQuestionUseCase {
    private static readonly MIN_ANSWER_LENGTH = 50;

    constructor(
        private readonly threadRepository: DiscussionThreadRepository,
        private readonly answerRepository: ThreadAnswerRepository,
        private readonly profileRepository: BusinessProfileRepository,
        private readonly eventPublisher: EventPublisher
    ) { }

    async execute(request: AnswerQuestionRequest): Promise<AnswerQuestionResponse> {
        // 1. Get discussion thread
        const thread = await this.threadRepository.findById(request.threadId);
        if (!thread) {
            throw new Error('Discussion thread not found');
        }

        // 2. Validate thread is not closed
        if (thread.status === 'CLOSED') {
            throw new Error('Cannot answer a closed thread');
        }

        // 3. Check if user can respond (response limit)
        const userResponseCount = await this.threadRepository.getUserResponseCount(
            request.threadId,
            request.answererUserId
        );

        if (!thread.canUserRespond(request.answererUserId, userResponseCount)) {
            throw new Error('Maximum responses per user exceeded for this thread');
        }

        // 4. Validate answer length
        if (typeof request.content !== 'string' || !request.content.trim()) {
            throw new Error('Answer content is required');
        }

        if (request.content.length < AnswerQuestionUseCase.MIN_ANSWER_LENGTH) {
            throw new Error(`Answer must be at least ${AnswerQuestionUseCase.MIN_ANSWER_LENGTH} characters`);
        }

        // 5. Get answerer's profile
        const profile = await this.profileRepository.findByUserId(request.answererUserId);
        if (!profile) {
            throw new Error('User business profile not found');
        }

        // 6. Validate relevant expertise (optional, but recommended)
        const hasRelevantExpertise = profile.expertiseAreas.some(
            e => e.area.toLowerCase() === thread.category.toLowerCase()
        );

        // 7. Calculate answer quality score (simplified - would use quality assessment engine)
        const qualityScore = this.calculateAnswerQuality(
            request.content,
            hasRelevantExpertise
        );

        // 8. Create and save answer
        const answer: ThreadAnswer = {
            id: request.answerId,
            threadId: request.threadId,
            authorId: request.answererUserId,
            content: request.content,
            qualityScore,
            isAccepted: false,
            createdAt: new Date(),
        };

        await this.answerRepository.save(answer);

        // 9. Activate thread if it was just opened
        if (thread.status === 'OPEN') {
            thread.activate();
            await this.threadRepository.save(thread);
        }

        // 10. Update answerer's contribution metrics
        const contributionPoints = this.calculateContributionPoints(qualityScore, hasRelevantExpertise);

        profile.updateContributionMetrics({
            helpfulAnswers: profile.contributionMetrics.helpfulAnswers + 1,
        });

        await this.profileRepository.save(profile);

        // 11. Publish event
        await this.eventPublisher.publish('AnswerProvided', {
            answerId: request.answerId,
            threadId: request.threadId,
            authorId: thread.authorId,
            answererId: request.answererUserId,
            qualityScore,
            hasRelevantExpertise,
            contributionPoints,
            timestamp: new Date(),
        });

        return {
            answerId: request.answerId,
            threadId: request.threadId,
            contributionPoints,
            qualityScore,
        };
    }

    private calculateAnswerQuality(content: string, hasRelevantExpertise: boolean): number {
        let score = 50; // Base score

        // Length bonus
        const wordCount = content.split(/\s+/).length;
        if (wordCount >= 100) {
            score += 20;
        } else if (wordCount >= 50) {
            score += 10;
        }

        // Expertise bonus
        if (hasRelevantExpertise) {
            score += 15;
        }

        // Check for examples
        if (/\b(example|instance|for instance|such as)\b/i.test(content)) {
            score += 10;
        }

        // Check for actionable advice
        if (/\b(recommend|suggest|try|consider|should|could)\b/i.test(content)) {
            score += 10;
        }

        return Math.min(100, score);
    }

    private calculateContributionPoints(qualityScore: number, hasRelevantExpertise: boolean): number {
        let points = 10; // Base points

        // Quality bonus
        if (qualityScore >= 80) {
            points += 15;
        } else if (qualityScore >= 60) {
            points += 10;
        }

        // Expertise bonus
        if (hasRelevantExpertise) {
            points += 10;
        }

        return points;
    }
}
