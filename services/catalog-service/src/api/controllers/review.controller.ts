// @ts-nocheck
/**
 * Review Controller
 * API layer controller for product review operations
 */

import { Request, Response } from 'express';
import { SubmitProductReviewUseCase } from '../../application/use-cases/submit-product-review.use-case';
import { GetProductReviewsUseCase } from '../../application/use-cases/get-product-reviews.use-case';
import { ModerateReviewUseCase } from '../../application/use-cases/moderate-review.use-case';

export class ReviewController {
  constructor(
    private readonly submitReviewUseCase: SubmitProductReviewUseCase,
    private readonly getReviewsUseCase: GetProductReviewsUseCase,
    private readonly moderateReviewUseCase: ModerateReviewUseCase
  ) {}

  /**
   * POST /v1/products/:id/reviews
   * Authenticated buyer submits a review
   */
  async submitReview(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const buyerId = (req as any).user?.userId || (req as any).user?.id;

      if (!buyerId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
        });
        return;
      }

      const { rating, comment } = req.body;

      const result = await this.submitReviewUseCase.execute({
        productId,
        buyerId,
        rating,
        comment
      });

      if (result.status === 'success') {
        res.status(201).json({
          success: true,
          data: result.review,
          meta: { timestamp: new Date() }
        });
        return;
      }

      const statusMap: Record<string, number> = {
        not_found: 404,
        forbidden: 403,
        conflict: 409,
        validation_error: 422
      };

      res.status(statusMap[result.status] ?? 400).json({
        success: false,
        error: {
          code: result.errorCode ?? 'ERROR',
          message: result.message
        },
        meta: { timestamp: new Date() }
      });

    } catch (error) {
      console.error('ReviewController.submitReview error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }
      });
    }
  }

  /**
   * GET /v1/products/:id/reviews
   * Public — paginated review listing
   */
  async getReviews(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const sortBy = req.query.sortBy as 'submittedAt' | 'rating' | undefined;

      const result = await this.getReviewsUseCase.execute({
        productId,
        page,
        limit,
        sortBy
      });

      if (result.status === 'success') {
        res.status(200).json({
          success: true,
          data: result.data?.reviews,
          meta: {
            timestamp: new Date(),
            pagination: {
              totalCount: result.data?.totalCount,
              totalPages: result.data?.totalPages,
              currentPage: result.data?.currentPage,
              limit: result.data?.limit
            }
          }
        });
        return;
      }

      res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.message },
        meta: { timestamp: new Date() }
      });

    } catch (error) {
      console.error('ReviewController.getReviews error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }
      });
    }
  }

  /**
   * PUT /v1/reviews/:reviewId/moderate
   * Admin only — update moderation status
   */
  async moderateReview(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId;
      const adminId = (req as any).user?.userId || (req as any).user?.id;
      const callerRoles: string[] = (req as any).user?.roles ?? [];
      const { newStatus } = req.body;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
        });
        return;
      }

      const result = await this.moderateReviewUseCase.execute({
        reviewId,
        newStatus,
        adminId,
        callerRoles
      });

      if (result.status === 'success') {
        res.status(200).json({
          success: true,
          data: result.review,
          meta: { timestamp: new Date() }
        });
        return;
      }

      const statusMap: Record<string, number> = {
        not_found: 404,
        forbidden: 403
      };

      res.status(statusMap[result.status] ?? 400).json({
        success: false,
        error: {
          code: result.errorCode ?? 'ERROR',
          message: result.message
        },
        meta: { timestamp: new Date() }
      });

    } catch (error) {
      console.error('ReviewController.moderateReview error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }
      });
    }
  }
}
