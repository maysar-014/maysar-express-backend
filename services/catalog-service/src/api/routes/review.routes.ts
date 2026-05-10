/**
 * Review Routes
 * RESTful route definitions for product review operations
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '@shared/middleware/auth-context.middleware';
import { validateRequest as validateSchemaRequest } from '../middleware/validation.middleware';
import { ReviewController } from '../controllers/review.controller';

const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional()
}).strict();

const getReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sortBy: z.enum(['submittedAt', 'rating']).optional()
}).strict();

const moderateReviewSchema = z.object({
  newStatus: z.enum(['VISIBLE', 'FLAGGED', 'HIDDEN'])
}).strict();

export function createReviewRoutes(reviewController: ReviewController): Router {
  const router = Router();

  /**
   * POST /v1/products/:id/reviews
   * Authenticated buyer submits a review
   */
  router.post(
    '/v1/products/:id/reviews',
    requireRole(['buyer', 'seller', 'admin']), // any authenticated user; seller check is in use case
    validateSchemaRequest(submitReviewSchema),
    async (req, res) => {
      await reviewController.submitReview(req, res);
    }
  );

  /**
   * GET /v1/products/:id/reviews
   * Public — paginated review listing
   */
  router.get(
    '/v1/products/:id/reviews',
    validateSchemaRequest(getReviewsQuerySchema, 'query'),
    async (req, res) => {
      await reviewController.getReviews(req, res);
    }
  );

  /**
   * PUT /v1/reviews/:reviewId/moderate
   * Admin only — update moderation status
   */
  router.put(
    '/v1/reviews/:reviewId/moderate',
    requireRole(['admin']),
    validateSchemaRequest(moderateReviewSchema),
    async (req, res) => {
      await reviewController.moderateReview(req, res);
    }
  );

  return router;
}
