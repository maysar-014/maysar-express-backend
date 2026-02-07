import { Request, Response, NextFunction } from 'express';
import { CreateDiscussionThreadUseCase } from '../../application/use-cases/create-discussion-thread.use-case';
import { AnswerQuestionUseCase } from '../../application/use-cases/answer-question.use-case';
import { DiscussionThreadMapper } from '../../application/mappers/discussion-thread.mapper';

export class DiscussionsController {
    constructor(
        private readonly createThreadUseCase: CreateDiscussionThreadUseCase,
        private readonly answerQuestionUseCase: AnswerQuestionUseCase
    ) { }

    /**
     * POST /discussions
     * Create a new discussion thread
     */
    async createDiscussion(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id; // From auth middleware
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await this.createThreadUseCase.execute({
                authorId: userId,
                topic: req.body.topic,
                content: req.body.content,
                category: req.body.category,
                expertiseLevel: req.body.expertiseLevel,
                businessContext: {
                    industry: req.body.industry || [],
                    businessStage: req.body.businessStage || '',
                    tags: req.body.tags || [],
                },
                maxResponsesPerUser: req.body.maxResponsesPerUser,
            });

            res.status(201).json({
                thread: DiscussionThreadMapper.toDTO(result.thread),
                matchedExperts: result.matchedExperts,
                quotaRemaining: result.quotaRemaining,
            });
        } catch (error: any) {
            if (error.message.includes('Quota exceeded') || error.message.includes('quality')) {
                res.status(429).json({ error: error.message });
            } else if (error.message.includes('Invalid') || error.message.includes('duplicate')) {
                res.status(400).json({ error: error.message });
            } else {
                next(error);
            }
        }
    }

    /**
     * POST /discussions/:threadId/answers
     * Submit an answer to a discussion thread
     */
    async submitAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { threadId } = req.params;
            const answerId = `answer_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            const result = await this.answerQuestionUseCase.execute({
                threadId,
                answerId,
                answererUserId: userId,
                content: req.body.content,
            });

            res.status(201).json(result);
        } catch (error: any) {
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else if (error.message.includes('closed') || error.message.includes('Maximum')) {
                res.status(400).json({ error: error.message });
            } else if (error.message.includes('must be at least')) {
                res.status(400).json({ error: error.message });
            } else {
                next(error);
            }
        }
    }

    /**
     * GET /discussions
     * List discussion threads
     */
    async listDiscussions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Implement pagination and filtering
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const category = req.query.category as string;
            const status = req.query.status as string;

            res.status(200).json({
                threads: [], // TODO: Implement list use case
                pagination: {
                    page,
                    limit,
                    total: 0,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /discussions/:threadId
     * Get a specific discussion thread
     */
    async getDiscussion(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { threadId } = req.params;

            // TODO: Implement get thread use case
            res.status(200).json({
                thread: null,
                answers: [],
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /discussions/:threadId/accept/:answerId
     * Accept an answer as the solution
     */
    async acceptAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { threadId, answerId } = req.params;

            // TODO: Implement accept answer use case
            res.status(200).json({
                message: 'Answer accepted',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /discussions/:threadId/close
     * Close a discussion thread
     */
    async closeDiscussion(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { threadId } = req.params;

            // TODO: Implement close thread use case
            res.status(200).json({
                message: 'Thread closed',
            });
        } catch (error) {
            next(error);
        }
    }
}
