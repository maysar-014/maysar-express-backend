/**
 * Submit Product Review Use Case
 * Handles buyer review submission with all business rule enforcement
 */

import { ProductRepository } from '../../domain/interfaces';
import { ProductReviewRepository } from '../../domain/repositories/product-review.repository.interface';
import { validateRating } from '../../domain/entities/product-review.entity';

export interface SubmitReviewRequest {
  productId: string;
  buyerId: string;
  rating: number;
  comment?: string;
}

export interface SubmitReviewResponse {
  status: 'success' | 'not_found' | 'forbidden' | 'conflict' | 'validation_error';
  errorCode?: string;
  message: string;
  review?: {
    id: string;
    productId: string;
    rating: number;
    comment: string | null;
    moderationStatus: string;
    submittedAt: string;
  };
}

export class SubmitProductReviewUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly reviewRepository: ProductReviewRepository
  ) {}

  async execute(request: SubmitReviewRequest): Promise<SubmitReviewResponse> {
    const { productId, buyerId, rating, comment } = request;

    // Step 1: Load product
    const product = await this.productRepository.findById(productId);
    if (!product) {
      return { status: 'not_found', message: 'Product not found' };
    }

    const sellerId = (product as any).sellerId;

    // Step 2: Seller self-review check (before purchase check per Req 4.3)
    if (sellerId && sellerId === buyerId) {
      return {
        status: 'forbidden',
        errorCode: 'REVIEW_SELLER_PROHIBITED',
        message: 'Sellers cannot review their own products.'
      };
    }

    // Step 3: Duplicate check
    const existing = await this.reviewRepository.findByBuyerAndProduct(buyerId, productId);
    if (existing) {
      return {
        status: 'conflict',
        errorCode: 'REVIEW_ALREADY_EXISTS',
        message: 'You have already submitted a review for this product.'
      };
    }

    // Step 4: Purchase verification
    const hasPurchased = await this.reviewRepository.hasPurchasedProduct(buyerId, productId);
    if (!hasPurchased) {
      return {
        status: 'forbidden',
        errorCode: 'REVIEW_PURCHASE_REQUIRED',
        message: 'You must have a delivered order for this product to submit a review.'
      };
    }

    // Step 5: Validate rating
    if (!validateRating(rating)) {
      return {
        status: 'validation_error',
        errorCode: 'VALIDATION_ERROR',
        message: 'Rating must be an integer between 1 and 5.'
      };
    }

    // Step 5b: Validate comment length
    if (comment !== undefined && comment !== null && comment.length > 2000) {
      return {
        status: 'validation_error',
        errorCode: 'VALIDATION_ERROR',
        message: 'Comment must not exceed 2000 characters.'
      };
    }

    // Step 6: Persist review
    const review = await this.reviewRepository.save({
      productId,
      buyerId,
      rating,
      comment: comment ?? null,
      moderationStatus: 'VISIBLE'
    });

    return {
      status: 'success',
      message: 'Review submitted successfully.',
      review: {
        id: review.id,
        productId: review.productId,
        rating: review.rating,
        comment: review.comment,
        moderationStatus: review.moderationStatus,
        submittedAt: review.submittedAt.toISOString()
      }
    };
  }
}
