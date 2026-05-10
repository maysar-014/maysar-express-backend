/**
 * Get Product Reviews Use Case
 * Returns paginated public reviews for a product
 */

import { ProductReviewRepository, PaginatedReviews } from '../../domain/repositories/product-review.repository.interface';

export interface GetProductReviewsRequest {
  productId: string;
  page?: number;
  limit?: number;
  sortBy?: 'submittedAt' | 'rating';
}

export interface GetProductReviewsResponse {
  status: 'success' | 'validation_error';
  message: string;
  data?: PaginatedReviews;
}

export class GetProductReviewsUseCase {
  constructor(private readonly reviewRepository: ProductReviewRepository) {}

  async execute(request: GetProductReviewsRequest): Promise<GetProductReviewsResponse> {
    const page = request.page ?? 1;
    const limit = request.limit ?? 10;
    const sortBy = request.sortBy ?? 'submittedAt';

    // Validate pagination
    if (!Number.isInteger(page) || page < 1) {
      return {
        status: 'validation_error',
        message: 'Page must be a positive integer (minimum 1).'
      };
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return {
        status: 'validation_error',
        message: 'Limit must be an integer between 1 and 50.'
      };
    }

    const data = await this.reviewRepository.findByProductId(request.productId, {
      page,
      limit,
      sortBy
    });

    return {
      status: 'success',
      message: 'Reviews retrieved successfully.',
      data
    };
  }
}
