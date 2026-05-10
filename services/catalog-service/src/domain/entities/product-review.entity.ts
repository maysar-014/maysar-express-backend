/**
 * Product Review Domain Entities
 * Domain layer entities for the product review and rating system
 */

export type ModerationStatus = 'VISIBLE' | 'FLAGGED' | 'HIDDEN';

export interface ProductReview {
  id: string;
  productId: string;
  buyerId: string;
  rating: number;           // integer [1, 5]
  comment: string | null;   // max 2000 chars
  moderationStatus: ModerationStatus;
  submittedAt: Date;
  updatedAt: Date;
}

export interface ReviewModerationLog {
  id: string;
  reviewId: string;
  adminId: string;
  previousStatus: ModerationStatus;
  newStatus: ModerationStatus;
  actionAt: Date;
}

/**
 * Validates that a rating value is a valid integer in [1, 5]
 */
export function validateRating(rating: unknown): rating is number {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Resolves a public display name from user profile fields.
 * Never exposes email address or user ID.
 */
export function resolveDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const parts = [user.firstName, user.lastName].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  );
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return user.email.split('@')[0];
}

/**
 * Computes the average rating for a set of ratings, rounded to 2 decimal places.
 * Returns null for an empty set.
 */
export function computeAverageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}

/**
 * Computes the rating distribution for a set of ratings.
 */
export function computeRatingDistribution(ratings: number[]): {
  1: number; 2: number; 3: number; 4: number; 5: number;
} {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    if (r >= 1 && r <= 5) {
      dist[r as 1 | 2 | 3 | 4 | 5]++;
    }
  }
  return dist;
}
