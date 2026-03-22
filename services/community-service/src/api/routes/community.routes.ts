import { Router } from 'express';
import { KnowledgeController } from '../controllers/knowledge.controller';
import { CommunityController } from '../controllers/community.controller';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import {
    emptyObjectBodyValidation,
    proposeChallengeValidation,
    submitArticleValidation,
    validateExpertiseValidation,
} from '../middleware/validation.middleware';

export function createKnowledgeRouter(knowledgeController: KnowledgeController): Router {
    const router = Router();

    // All routes require authentication
    // router.use(authMiddleware);

    /**
     * @route POST /api/community/knowledge/articles
     * @desc Submit a new knowledge article
     * @access Private (reputation >= 500)
     */
    router.post('/articles', requireAuth, submitArticleValidation, asyncHandler((req, res, next) => knowledgeController.submitArticle(req, res, next)));

    /**
     * @route GET /api/community/knowledge/articles
     * @desc List knowledge articles
     * @access Public
     */
    router.get('/articles', asyncHandler((req, res, next) => knowledgeController.listArticles(req, res, next)));

    /**
     * @route GET /api/community/knowledge/articles/:articleId
     * @desc Get a specific article
     * @access Public
     */
    router.get('/articles/:articleId', asyncHandler((req, res, next) => knowledgeController.getArticle(req, res, next)));

    /**
     * @route POST /api/community/knowledge/articles/:articleId/reviews
     * @desc Submit a peer review
     * @access Private (experts only)
     */
    router.post('/articles/:articleId/reviews', requireAuth, asyncHandler((req, res, next) => knowledgeController.submitReview(req, res, next)));

    /**
     * @route POST /api/community/knowledge/articles/:articleId/publish
     * @desc Publish an approved article
     * @access Private (author or admin)
     */
    router.post('/articles/:articleId/publish', requireAuth, emptyObjectBodyValidation, asyncHandler((req, res, next) => knowledgeController.publishArticle(req, res, next)));

    return router;
}

export function createCommunityRouter(communityController: CommunityController): Router {
    const router = Router();

    /**
     * @route GET /api/community/discover
     * @desc Get personalized content recommendations
     * @access Private
     */
    router.get('/discover', requireAuth, asyncHandler((req, res, next) => communityController.discoverContent(req, res, next)));

    /**
     * @route POST /api/community/challenges
     * @desc Propose a business challenge
     * @access Private
     */
    router.post('/challenges', requireAuth, proposeChallengeValidation, asyncHandler((req, res, next) => communityController.proposeChallenge(req, res, next)));

    /**
     * @route GET /api/community/challenges
     * @desc List business challenges
     * @access Public
     */
    router.get('/challenges', asyncHandler((req, res, next) => communityController.listChallenges(req, res, next)));

    /**
     * @route POST /api/community/challenges/:challengeId/solutions
     * @desc Submit a solution to a challenge
     * @access Private
     */
    router.post('/challenges/:challengeId/solutions', requireAuth, asyncHandler((req, res, next) => communityController.submitSolution(req, res, next)));

    /**
     * @route POST /api/community/expertise/validate
     * @desc Validate user expertise
     * @access Private
     */
    router.post('/expertise/validate', requireAuth, validateExpertiseValidation, asyncHandler((req, res, next) => communityController.validateExpertise(req, res, next)));

    return router;
}
