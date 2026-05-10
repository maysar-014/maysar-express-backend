/**
 * Moderate Review Use Case
 * Admin-only: update a review's moderation status with audit log
 */

import { ModerationStatus } from '../../domain/entities/product-review.entity';
import { ProductReviewRepository } from '../../domain/repositories/product-review.repository.interface';

export interface ModerateReviewRequest {
  reviewId: string;
  newStatus: ModerationStatus;
  adminId: string;
  callerRoles: string[];
}

export interface ModerateReviewResponse {
  status: 'success' | 'not_found' | 'forbidden';
  errorCode?: string;
  message: string;
  review?: {
    id: string;
    productId: string;
    moderationStatus: string;
    updatedAt: string;
  };
}

export class ModerateReviewUseCase {
  constructor(private readonly reviewRepository: ProductReviewRepository) {}

  async execute(request: ModerateReviewRequest): Promise<ModerateReviewResponse> {
    const { reviewId, newStatus, adminId, callerRoles } = request;

    // Step 1: Admin role check
    if (!callerRoles.includes('admin')) {
      return {
        status: 'forbidden',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only administrators can moderate reviews.'
      };
    }

    // Step 2: Load review
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      return {
        status: 'not_found',
        message: 'Review not found.'
      };
    }

    // Step 3: Update moderation status with audit log
    const updated = await this.reviewRepository.updateModerationStatus(
      reviewId,
      newStatus,
      adminId,
      review.moderationStatus
    );

    return {
      status: 'success',
      message: `Review moderation status updated to ${newStatus}.`,
      review: {
        id: updated.id,
        productId: updated.productId,
        moderationStatus: updated.moderationStatus,
        updatedAt: updated.updatedAt.toISOString()
      }
    };
  }
}
