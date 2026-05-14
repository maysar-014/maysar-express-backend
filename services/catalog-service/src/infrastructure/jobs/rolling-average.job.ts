/**
 * Rolling Average Job
 * Computes per-seller rolling means and standard deviations for all rate-based
 * signals directly from the orders table. Results are persisted so the ranking
 * engine can use them for Bayesian prior blending and fraud detection (Requirement 3).
 *
 * Runs once every 24 hours. No external analytics service required — all data
 * is sourced directly from the orders and order_cod_disputes tables.
 */

import { PrismaClient } from '@prisma/client';
import { computeRecencyWeightedRate } from '../../domain/buy-box/signals/recency-weighted-rate';

/** Persisted rolling stats shape stored as JSON. */
export interface SellerRollingStats {
  sellerId: string;
  windowDays: number;
  computedAt: Date;
  /** Rolling mean for each rate-based signal (0–100 inverted score scale). */
  mean: {
    disputeRate: number;
    cancellationRate: number;
    returnRate: number;
    fulfillmentReliability: number;
    stockReliability: number;
  };
  /** Rolling std dev for each rate-based signal (same scale). */
  stdDev: {
    disputeRate: number;
    cancellationRate: number;
    returnRate: number;
    fulfillmentReliability: number;
    stockReliability: number;
  };
  orderCount: number;
}

export class RollingAverageJob {
  private readonly WINDOW_DAYS = 90;

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Compute rolling averages for all active sellers and persist them.
   * Reads directly from orders + order_cod_disputes — no analytics service needed.
   */
  async run(): Promise<void> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - this.WINDOW_DAYS);

    // Get all distinct sellers with orders in the 90-day window
    const sellerRows = await this.prisma.order_Order.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { sellerId: true },
      distinct: ['sellerId'],
    });

    let processed = 0;
    let errors = 0;

    for (const { sellerId } of sellerRows) {
      try {
        await this.computeAndPersistForSeller(sellerId, windowStart);
        processed++;
      } catch (err) {
        errors++;
        console.error(`[RollingAverageJob] Error processing seller ${sellerId}:`, err);
      }
    }

    console.info(
      `[RollingAverageJob] Complete. Processed: ${processed}, Errors: ${errors}`,
    );
  }

  private async computeAndPersistForSeller(
    sellerId: string,
    windowStart: Date,
  ): Promise<void> {
    // Fetch all orders for this seller in the 90-day window with dispute data
    const orders = await this.prisma.order_Order.findMany({
      where: { sellerId, createdAt: { gte: windowStart } },
      include: { codDisputes: true },
      orderBy: { createdAt: 'asc' },
    });

    if (orders.length === 0) return;

    // Build event arrays for each signal
    const disputeEvents = orders.map((o) => ({
      occurredAt: o.createdAt,
      isNegative: (o.codDisputes?.length ?? 0) > 0,
    }));

    const cancellationEvents = orders.map((o) => ({
      occurredAt: o.createdAt,
      isNegative: o.status === 'CANCELLED',
    }));

    const returnEvents = orders.map((o) => ({
      occurredAt: o.createdAt,
      // Proxy: seller-cancelled after dispatch = return/refund
      isNegative: o.status === 'CANCELLED',
    }));

    const fulfillmentEvents = orders.map((o) => ({
      occurredAt: o.createdAt,
      isNegative: o.status !== 'DELIVERED',
    }));

    const stockOutEvents = orders.map((o) => ({
      occurredAt: o.createdAt,
      isNegative: o.status === 'CANCELLED',
    }));

    // Compute recency-weighted rates using exponential decay (Requirement 3)
    const disputeResult = computeRecencyWeightedRate(disputeEvents);
    const cancellationResult = computeRecencyWeightedRate(cancellationEvents);
    const returnResult = computeRecencyWeightedRate(returnEvents);
    const fulfillmentResult = computeRecencyWeightedRate(fulfillmentEvents);
    const stockResult = computeRecencyWeightedRate(stockOutEvents);

    // Convert rates to inverted 0–100 scores (same scale as signal computers)
    const toScore = (rate: number) => Math.max(0, Math.min(100, (1 - rate) * 100));

    const mean = {
      disputeRate: toScore(disputeResult.rate),
      cancellationRate: toScore(cancellationResult.rate),
      returnRate: toScore(returnResult.rate),
      fulfillmentReliability: toScore(fulfillmentResult.rate),
      stockReliability: toScore(stockResult.rate),
    };

    // Population std dev of binary outcomes (0 or 100) per signal
    const stdDev = {
      disputeRate: this.computeStdDev(disputeEvents.map((e) => e.isNegative ? 0 : 100)),
      cancellationRate: this.computeStdDev(cancellationEvents.map((e) => e.isNegative ? 0 : 100)),
      returnRate: this.computeStdDev(returnEvents.map((e) => e.isNegative ? 0 : 100)),
      fulfillmentReliability: this.computeStdDev(fulfillmentEvents.map((e) => e.isNegative ? 0 : 100)),
      stockReliability: this.computeStdDev(stockOutEvents.map((e) => e.isNegative ? 0 : 100)),
    };

    const stats: SellerRollingStats = {
      sellerId,
      windowDays: this.WINDOW_DAYS,
      computedAt: new Date(),
      mean,
      stdDev,
      orderCount: orders.length,
    };

    // Persist to operator audit log as a key-value store
    // entityType='SellerRollingStats', entityId=sellerId, field='stats'
    // This avoids a new migration while keeping the data queryable.
    await this.prisma.catalog_OperatorAuditLog.create({
      data: {
        operatorId: 'SYSTEM',
        entityType: 'SellerRollingStats',
        entityId: sellerId,
        field: 'stats',
        previousValue: undefined,
        newValue: stats as any,
        changedAt: new Date(),
      },
    });
  }

  private computeStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}
