import { Request, Response, NextFunction } from 'express';
import { ProposeBusinessChallengeUseCase } from '../../application/use-cases/propose-business-challenge.use-case';
import { ValidateExpertiseUseCase } from '../../application/use-cases/validate-expertise.use-case';
import { DiscoverContentUseCase } from '../../application/use-cases/discover-content.use-case';
import { BusinessProfileMapper } from '../../application/mappers/business-profile.mapper';

export class CommunityController {
    constructor(
        private readonly proposeChallengeUseCase: ProposeBusinessChallengeUseCase,
        private readonly validateExpertiseUseCase: ValidateExpertiseUseCase,
        private readonly discoverContentUseCase: DiscoverContentUseCase
    ) { }

    /**
     * POST /challenges
     * Propose a new business challenge
     */
    async proposeChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await this.proposeChallengeUseCase.execute({
                proposerId: userId,
                title: req.body.title,
                description: req.body.description,
                category: req.body.category,
                industryTags: req.body.industryTags || [],
                constraints: req.body.constraints || [],
                successCriteria: req.body.successCriteria,
                deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
            });

            res.status(201).json(result);
        } catch (error: any) {
            if (error.message.includes('Quota exceeded')) {
                res.status(429).json({ error: error.message });
            } else if (error.message.includes('Invalid') || error.message.includes('Similar')) {
                res.status(400).json({ error: error.message });
            } else {
                next(error);
            }
        }
    }

    /**
     * POST /expertise/validate
     * Validate user expertise in an area
     */
    async validateExpertise(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await this.validateExpertiseUseCase.execute({
                userId,
                expertiseArea: req.body.expertiseArea,
                targetLevel: req.body.targetLevel,
            });

            if (!result.verified) {
                res.status(400).json({
                    verified: false,
                    missingRequirements: result.missingRequirements,
                });
                return;
            }

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /discover
     * Get personalized content recommendations
     */
    async discoverContent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const sessionType = req.query.sessionType as 'daily' | 'weekly' | 'ondemand' | undefined;
            const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : undefined;

            const result = await this.discoverContentUseCase.execute({
                userId,
                sessionType,
                maxResults,
            });

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /challenges
     * List business challenges
     */
    async listChallenges(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const category = req.query.category as string;
            const status = req.query.status as string;

            // TODO: Implement list challenges use case
            res.status(200).json({
                challenges: [],
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
     * POST /challenges/:challengeId/solutions
     * Submit a solution to a challenge
     */
    async submitSolution(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { challengeId } = req.params;

            // TODO: Implement submit solution use case
            res.status(201).json({
                message: 'Solution submitted',
            });
        } catch (error) {
            next(error);
        }
    }
}
