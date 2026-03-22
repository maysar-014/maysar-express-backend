import { Request, Response, NextFunction } from 'express';
import { SubmitKnowledgeArticleUseCase } from '../../application/use-cases/submit-knowledge-article.use-case';

export class KnowledgeController {
    constructor(
        private readonly submitArticleUseCase: SubmitKnowledgeArticleUseCase
    ) { }

    private getAuthenticatedUserId(req: Request): string | null {
        const resolved = (req as any).user?.userId || (req as any).user?.id;
        return typeof resolved === 'string' && resolved.trim().length > 0 ? resolved : null;
    }

    /**
     * POST /knowledge/articles
     * Submit a new knowledge article
     */
    async submitArticle(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = this.getAuthenticatedUserId(req);
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await this.submitArticleUseCase.execute({
                authorId: userId,
                title: req.body.title,
                summary: req.body.summary,
                sections: req.body.sections,
                category: req.body.category,
                industryTags: req.body.industryTags || [],
                expertiseLevel: req.body.expertiseLevel,
            });

            res.status(201).json({
                article: result.article,
                requiresPeerReview: result.requiresPeerReview,
                quotaRemaining: result.quotaRemaining,
            });
        } catch (error: any) {
            if (error.message.includes('Insufficient reputation')) {
                res.status(403).json({ error: error.message });
            } else if (error.message.includes('Quota exceeded')) {
                res.status(429).json({ error: error.message });
            } else if (error.message.includes('Invalid') || error.message.includes('already exists')) {
                res.status(400).json({ error: error.message });
            } else {
                next(error);
            }
        }
    }

    /**
     * GET /knowledge/articles
     * List knowledge articles
     */
    async listArticles(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const category = req.query.category as string;
            const reviewStatus = req.query.reviewStatus as string;

            // TODO: Implement list articles use case
            res.status(200).json({
                articles: [],
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
     * GET /knowledge/articles/:articleId
     * Get a specific article
     */
    async getArticle(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { articleId } = req.params;

            // TODO: Implement get article use case
            res.status(200).json({
                article: null,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /knowledge/articles/:articleId/reviews
     * Submit a peer review for an article
     */
    async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = this.getAuthenticatedUserId(req);
            const { articleId } = req.params;

            // TODO: Implement submit review use case
            res.status(201).json({
                success: true,
                message: 'Review submitted',
                data: {
                    articleId,
                    reviewerId: userId ?? null
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /knowledge/articles/:articleId/publish
     * Publish an approved article
     */
    async publishArticle(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = this.getAuthenticatedUserId(req);
            const { articleId } = req.params;

            // TODO: Implement publish article use case
            res.status(200).json({
                success: true,
                message: 'Article published',
                data: {
                    articleId,
                    publishedBy: userId ?? null
                }
            });
        } catch (error) {
            next(error);
        }
    }
}
