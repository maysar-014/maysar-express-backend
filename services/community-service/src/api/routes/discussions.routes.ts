import { Router } from 'express';
import { DiscussionsController } from '../controllers/discussions.controller';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import {
    answerQuestionValidation,
    createDiscussionValidation,
    emptyObjectBodyValidation,
} from '../middleware/validation.middleware';

export function createDiscussionsRouter(controller: DiscussionsController): Router {
    const router = Router();

    // All routes require authentication (add auth middleware)
    // router.use(authMiddleware);

    /**
     * @route POST /api/community/discussions
     * @desc Create a new discussion thread
     * @access Private
     */
    router.post('/', requireAuth, createDiscussionValidation, asyncHandler((req, res, next) => controller.createDiscussion(req, res, next)));

    /**
     * @route GET /api/community/discussions
     * @desc List discussion threads
     * @access Public
     */
    router.get('/', asyncHandler((req, res, next) => controller.listDiscussions(req, res, next)));

    /**
     * @route GET /api/community/discussions/:threadId
     * @desc Get a specific discussion thread
     * @access Public
     */
    router.get('/:threadId', asyncHandler((req, res, next) => controller.getDiscussion(req, res, next)));

    /**
     * @route POST /api/community/discussions/:threadId/answers
     * @desc Submit an answer to a discussion
     * @access Private
     */
    router.post('/:threadId/answers', requireAuth, answerQuestionValidation, asyncHandler((req, res, next) => controller.submitAnswer(req, res, next)));

    /**
     * @route PATCH /api/community/discussions/:threadId/accept/:answerId
     * @desc Accept an answer as the solution
     * @access Private (thread author only)
     */
    router.patch('/:threadId/accept/:answerId', requireAuth, emptyObjectBodyValidation, asyncHandler((req, res, next) => controller.acceptAnswer(req, res, next)));

    /**
     * @route PATCH /api/community/discussions/:threadId/close
     * @desc Close a discussion thread
     * @access Private (thread author or admin)
     */
    router.patch('/:threadId/close', requireAuth, emptyObjectBodyValidation, asyncHandler((req, res, next) => controller.closeDiscussion(req, res, next)));

    return router;
}
