import { Router } from 'express';
import { KnowledgeController } from '../controllers/knowledge.controller';
import { CommunityController } from '../controllers/community.controller';

export function createKnowledgeRouter(knowledgeController: KnowledgeController): Router {
    const router = Router();

    // All routes require authentication
    // router.use(authMiddleware);

    /**
     * @route POST /api/community/knowledge/articles
     * @desc Submit a new knowledge article
     * @access Private (reputation >= 500)
     */
    router.post('/articles', (req, res, next) => knowledgeController.submitArticle(req, res, next));

    /**
     * @route GET /api/community/knowledge/articles
     * @desc List knowledge articles
     * @access Public
     */
    router.get('/articles', (req, res, next) => knowledgeController.listArticles(req, res, next));

    /**
     * @route GET /api/community/knowledge/articles/:articleId
     * @desc Get a specific article
     * @access Public
     */
    router.get('/articles/:articleId', (req, res, next) => knowledgeController.getArticle(req, res, next));

    /**
     * @route POST /api/community/knowledge/articles/:articleId/reviews
     * @desc Submit a peer review
     * @access Private (experts only)
     */
    router.post('/articles/:articleId/reviews', (req, res, next) => knowledgeController.submitReview(req, res, next));

    /**
     * @route POST /api/community/knowledge/articles/:articleId/publish
     * @desc Publish an approved article
     * @access Private (author or admin)
     */
    router.post('/articles/:articleId/publish', (req, res, next) => knowledgeController.publishArticle(req, res, next));

    return router;
}

export function createCommunityRouter(communityController: CommunityController): Router {
    const router = Router();

    /**
     * @route GET /api/community/discover
     * @desc Get personalized content recommendations
     * @access Private
     */
    router.get('/discover', (req, res, next) => communityController.discoverContent(req, res, next));

    /**
     * @route POST /api/community/challenges
     * @desc Propose a business challenge
     * @access Private
     */
    router.post('/challenges', (req, res, next) => communityController.proposeChallenge(req, res, next));

    /**
     * @route GET /api/community/challenges
     * @desc List business challenges
     * @access Public
     */
    router.get('/challenges', (req, res, next) => communityController.listChallenges(req, res, next));

    /**
     * @route POST /api/community/challenges/:challengeId/solutions
     * @desc Submit a solution to a challenge
     * @access Private
     */
    router.post('/challenges/:challengeId/solutions', (req, res, next) => communityController.submitSolution(req, res, next));

    /**
     * @route POST /api/community/expertise/validate
     * @desc Validate user expertise
     * @access Private
     */
    router.post('/expertise/validate', (req, res, next) => communityController.validateExpertise(req, res, next));

    return router;
}
