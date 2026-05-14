/**
 * Buy Box Recomputation Job
 * Scheduled job that triggers Buy Box ranking recomputation for products.
 *
 * Supports three modes:
 *  - Full recomputation: all products with an existing buy box or active variants
 *  - Delta recomputation: all products offered by a specific seller
 *  - Category recomputation: all products in a specific category
 */

import { PrismaClient } from '@prisma/client';
import { ComputeBuyBoxRankingUseCase } from '../../application/use-cases/compute-buy-box-ranking.use-case';

export class BuyBoxRecomputationJob {
  constructor(
    private computeUseCase: ComputeBuyBoxRankingUseCase,
    private prisma: PrismaClient,
  ) {}

  /**
   * Recompute Buy Box rankings for all products that either have an existing
   * buy box record or have at least one active variant with stock.
   */
  async runFullRecomputation(): Promise<void> {
    // Products that already have a buy box record
    const buyBoxProducts = await this.prisma.buyBox.findMany({
      select: { productId: true },
    });

    // Products that have active variants
    const variantProducts = await this.prisma.productVariant.findMany({
      where: { status: 'active' },
      select: { productId: true },
      distinct: ['productId'],
    });

    // Merge and deduplicate product IDs
    const productIdSet = new Set<string>();
    for (const { productId } of buyBoxProducts) {
      productIdSet.add(productId);
    }
    for (const { productId } of variantProducts) {
      productIdSet.add(productId);
    }

    const productIds = Array.from(productIdSet);
    let errorCount = 0;

    for (const productId of productIds) {
      try {
        await this.computeUseCase.execute(productId, { productId }, 'DEFAULT');
      } catch (err) {
        errorCount++;
        console.error(
          `[BuyBoxRecomputationJob] Error recomputing buy box for product ${productId}:`,
          err,
        );
      }
    }

    console.info(
      `[BuyBoxRecomputationJob] Full recomputation complete. ` +
        `Processed: ${productIds.length}, Errors: ${errorCount}`,
    );
  }

  /**
   * Recompute Buy Box rankings for all products offered by a specific seller.
   */
  async runDeltaRecomputation(sellerId: string): Promise<void> {
    const products = await this.prisma.product.findMany({
      where: { sellerId },
      select: { id: true },
    });

    let errorCount = 0;

    for (const { id: productId } of products) {
      try {
        await this.computeUseCase.execute(productId, { productId }, 'DEFAULT');
      } catch (err) {
        errorCount++;
        console.error(
          `[BuyBoxRecomputationJob] Error recomputing buy box for product ${productId} (seller ${sellerId}):`,
          err,
        );
      }
    }

    console.info(
      `[BuyBoxRecomputationJob] Delta recomputation complete for seller ${sellerId}. ` +
        `Processed: ${products.length}, Errors: ${errorCount}`,
    );
  }

  /**
   * Recompute Buy Box rankings for all products in a specific category.
   */
  async runCategoryRecomputation(categoryId: string): Promise<void> {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      select: { id: true },
    });

    let errorCount = 0;

    for (const { id: productId } of products) {
      try {
        await this.computeUseCase.execute(productId, { productId }, categoryId);
      } catch (err) {
        errorCount++;
        console.error(
          `[BuyBoxRecomputationJob] Error recomputing buy box for product ${productId} (category ${categoryId}):`,
          err,
        );
      }
    }

    console.info(
      `[BuyBoxRecomputationJob] Category recomputation complete for category ${categoryId}. ` +
        `Processed: ${products.length}, Errors: ${errorCount}`,
    );
  }
}
