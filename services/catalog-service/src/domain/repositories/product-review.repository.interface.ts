/**
 * Product Review Repository Interface
 * Domain layer contract for product review persistence
 */

import { ModerationStatus, ProductReview } from '../entities/product-review.entity';

export interface ReviewPublicDto {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string;
  submittedAt: string; // ISO 8601 UTC
}

export interface ReviewListOptions {
  page: number;
  limit: number;
  sortBy?: 'submittedAt' | 'rating';
}

export interface PaginatedReviews {
  reviews: ReviewPublicDto[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface ReviewAggregateStats {
  averageRating: number | null;
  reviewCount: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface ProductReviewRepository {
  save(review: Omit<ProductReview, 'id' | 'submittedAt' | 'updatedAt'>): Promise<ProductReview>;
  findById(reviewId: string): Promise<ProductReview | null>;
  findByProductId(productId: string, options: ReviewListOptions): Promise<PaginatedReviews>;
  findByBuyerAndProduct(buyerId: string, productId: string): Promise<ProductReview | null>;
  getAggregateStats(productId: string): Promise<ReviewAggregateStats>;
  updateModerationStatus(
    reviewId: string,
    newStatus: ModerationStatus,
    adminId: string,
    previousStatus: ModerationStatus
  ): Promise<ProductReview>;
  hasPurchasedProduct(buyerId: string, productId: string): Promise<boolean>;
}
