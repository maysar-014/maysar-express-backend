// @ts-nocheck
/**
 * Prisma Product Review Repository
 * Infrastructure implementation of ProductReviewRepository
 */

import { PrismaClient } from '@prisma/client';
import { ProductReview, ModerationStatus, resolveDisplayName } from '../../domain/entities/product-review.entity';
import {
  ProductReviewRepository,
  ReviewListOptions,
  PaginatedReviews,
  ReviewAggregateStats,
  ReviewPublicDto
} from '../../domain/repositories/product-review.repository.interface';
import { makeId, getModelPrefix } from '@shared/ids/id';

export class PrismaProductReviewRepository implements ProductReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  async save(
    review: Omit<ProductReview, 'id' | 'submittedAt' | 'updatedAt'>
  ): Promise<ProductReview> {
    const id = makeId(getModelPrefix('Catalog_ProductReview'));
    const record = await (this.prisma as any).catalog_ProductReview.create({
      data: {
        id,
        productId: review.productId,
        buyerId: review.buyerId,
        rating: review.rating,
        comment: review.comment ?? null,
        moderationStatus: review.moderationStatus
      }
    });
    return this.mapToDomain(record);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async findById(reviewId: string): Promise<ProductReview | null> {
    const record = await (this.prisma as any).catalog_ProductReview.findUnique({
      where: { id: reviewId }
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findByBuyerAndProduct(buyerId: string, productId: string): Promise<ProductReview | null> {
    const record = await (this.prisma as any).catalog_ProductReview.findUnique({
      where: { productId_buyerId: { productId, buyerId } }
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findByProductId(productId: string, options: ReviewListOptions): Promise<PaginatedReviews> {
    const { page, limit, sortBy = 'submittedAt' } = options;
    const skip = (page - 1) * limit;

    const orderBy = sortBy === 'rating'
      ? { rating: 'desc' as const }
      : { submittedAt: 'desc' as const };

    const [records, totalCount] = await Promise.all([
      (this.prisma as any).catalog_ProductReview.findMany({
        where: { productId, moderationStatus: 'VISIBLE' },
        orderBy,
        skip,
        take: limit
      }),
      (this.prisma as any).catalog_ProductReview.count({
        where: { productId, moderationStatus: 'VISIBLE' }
      })
    ]);

    // Enrich with display names
    const buyerIds = [...new Set(records.map((r: any) => r.buyerId))];
    const displayNameMap = await this.fetchDisplayNames(buyerIds as string[]);

    const reviews: ReviewPublicDto[] = records.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? null,
      displayName: displayNameMap.get(r.buyerId) ?? 'Buyer',
      submittedAt: r.submittedAt instanceof Date
        ? r.submittedAt.toISOString()
        : new Date(r.submittedAt).toISOString()
    }));

    return {
      reviews,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      limit
    };
  }

  // ---------------------------------------------------------------------------
  // Aggregates
  // ---------------------------------------------------------------------------

  async getAggregateStats(productId: string): Promise<ReviewAggregateStats> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        averageRating: string | null;
        reviewCount: bigint;
        dist1: bigint;
        dist2: bigint;
        dist3: bigint;
        dist4: bigint;
        dist5: bigint;
      }>>`
        SELECT
          ROUND(AVG(rating)::numeric, 2)                          AS "averageRating",
          COUNT(*)                                                 AS "reviewCount",
          COUNT(*) FILTER (WHERE rating = 1)                      AS "dist1",
          COUNT(*) FILTER (WHERE rating = 2)                      AS "dist2",
          COUNT(*) FILTER (WHERE rating = 3)                      AS "dist3",
          COUNT(*) FILTER (WHERE rating = 4)                      AS "dist4",
          COUNT(*) FILTER (WHERE rating = 5)                      AS "dist5"
        FROM catalog_product_reviews
        WHERE "productId" = ${productId}
          AND "moderationStatus" = 'VISIBLE'
      `;

      const row = result[0];
      const reviewCount = Number(row?.reviewCount ?? 0);

      return {
        averageRating: row?.averageRating != null ? parseFloat(row.averageRating) : null,
        reviewCount,
        ratingDistribution: {
          1: Number(row?.dist1 ?? 0),
          2: Number(row?.dist2 ?? 0),
          3: Number(row?.dist3 ?? 0),
          4: Number(row?.dist4 ?? 0),
          5: Number(row?.dist5 ?? 0)
        }
      };
    } catch (error) {
      console.warn('[PrismaProductReviewRepository] getAggregateStats failed, returning zero stats:', (error as Error).message);
      return {
        averageRating: null,
        reviewCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Moderation
  // ---------------------------------------------------------------------------

  async updateModerationStatus(
    reviewId: string,
    newStatus: ModerationStatus,
    adminId: string,
    previousStatus: ModerationStatus
  ): Promise<ProductReview> {
    const logId = makeId(getModelPrefix('Catalog_ReviewModerationLog'));

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const review = await tx.catalog_ProductReview.update({
        where: { id: reviewId },
        data: { moderationStatus: newStatus }
      });

      await tx.catalog_ReviewModerationLog.create({
        data: {
          id: logId,
          reviewId,
          adminId,
          previousStatus,
          newStatus
        }
      });

      return review;
    });

    return this.mapToDomain(updated);
  }

  // ---------------------------------------------------------------------------
  // Purchase verification
  // ---------------------------------------------------------------------------

  async hasPurchasedProduct(buyerId: string, productId: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) AS count
        FROM orders o
        JOIN order_items oi ON oi."orderId" = o.id
        WHERE o."buyerId" = ${buyerId}
          AND oi."productId" = ${productId}
          AND o.status = 'DELIVERED'
        LIMIT 1
      `;
      return Number(result[0]?.count ?? 0) > 0;
    } catch (error) {
      console.warn('[PrismaProductReviewRepository] hasPurchasedProduct failed, denying review as safe default:', (error as Error).message);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapToDomain(record: any): ProductReview {
    return {
      id: record.id,
      productId: record.productId,
      buyerId: record.buyerId,
      rating: record.rating,
      comment: record.comment ?? null,
      moderationStatus: record.moderationStatus as ModerationStatus,
      submittedAt: record.submittedAt instanceof Date ? record.submittedAt : new Date(record.submittedAt),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt : new Date(record.updatedAt)
    };
  }

  private async fetchDisplayNames(buyerIds: string[]): Promise<Map<string, string>> {
    if (buyerIds.length === 0) return new Map();

    const map = new Map<string, string>();

    try {
      const users = await (this.prisma as any).user_User.findMany({
        where: { id: { in: buyerIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      for (const user of users) {
        map.set(user.id, resolveDisplayName({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }));
      }
    } catch {
      // Fallback — display names unavailable
    }

    for (const id of buyerIds) {
      if (!map.has(id)) map.set(id, 'Buyer');
    }

    return map;
  }
}
