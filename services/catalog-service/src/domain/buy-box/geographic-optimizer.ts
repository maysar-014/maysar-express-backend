/**
 * Geographic Optimizer
 * Adjusts buy-box ranking signals based on zone-specific delivery performance.
 * Implements Requirement 7 (geographic signal adjustment).
 */

import { GeographicZone, SignalValues } from './types';
import { BuyBoxRankingRepository } from './repositories/buy-box-ranking.repository.interface';

export class GeographicOptimizer {
  constructor(private repository: BuyBoxRankingRepository) {}

  /**
   * Returns zone-adjusted signal values for a seller in a given geographic zone.
   *
   * When zone performance data is unavailable (null) or based on fewer than 5 orders,
   * the base signals are returned unchanged (geographic fallback — Requirement 7.2).
   *
   * When sufficient zone data exists, `fulfillmentReliability` and `deliverySpeed`
   * are blended 70% zone-actual / 30% base-signal.
   */
  async getZoneAdjustedSignals(
    sellerId: string,
    zone: GeographicZone,
    baseSignals: SignalValues,
  ): Promise<SignalValues> {
    const zonePerf = await this.repository.getZonePerformance(sellerId, zone);

    // Fallback: no data or insufficient sample size
    if (zonePerf === null || zonePerf.orderCount < 5) {
      return { ...baseSignals };
    }

    const { deliverySuccessRate: zoneDeliverySuccessRate, avgDeliveryDays } = zonePerf;

    // Zone-adjusted fulfillment reliability
    const rawFulfillment =
      zoneDeliverySuccessRate * 100 * 0.70 + baseSignals.fulfillmentReliability * 0.30;
    const adjustedFulfillmentReliability = Math.min(100, Math.max(0, rawFulfillment));

    // Zone delivery speed score: 1 day → 100, 11 days → 0
    const zoneDeliverySpeedScore = Math.max(0, 100 - (avgDeliveryDays - 1) * 10);
    const rawDeliverySpeed =
      zoneDeliverySpeedScore * 0.70 + baseSignals.deliverySpeed * 0.30;
    const adjustedDeliverySpeed = Math.min(100, Math.max(0, rawDeliverySpeed));

    return {
      ...baseSignals,
      fulfillmentReliability: adjustedFulfillmentReliability,
      deliverySpeed: adjustedDeliverySpeed,
    };
  }

  /**
   * Records a delivery outcome for a seller in a zone and updates the rolling
   * zone performance statistics via the repository.
   */
  async updateZonePerformance(
    sellerId: string,
    zone: GeographicZone,
    deliveryOutcome: { success: boolean; deliveryDays: number },
  ): Promise<void> {
    const existing = await this.repository.getZonePerformance(sellerId, zone);

    let newSuccessRate: number;
    let newAvgDays: number;
    let newOrderCount: number;

    if (existing === null) {
      // First delivery event for this seller/zone combination
      newSuccessRate = deliveryOutcome.success ? 1.0 : 0.0;
      newAvgDays = deliveryOutcome.deliveryDays;
      newOrderCount = 1;
    } else {
      // Rolling update
      newOrderCount = existing.orderCount + 1;
      newSuccessRate =
        (existing.deliverySuccessRate * existing.orderCount +
          (deliveryOutcome.success ? 1 : 0)) /
        newOrderCount;
      newAvgDays =
        (existing.avgDeliveryDays * existing.orderCount + deliveryOutcome.deliveryDays) /
        newOrderCount;
    }

    await this.repository.upsertZonePerformance(
      sellerId,
      zone,
      newSuccessRate,
      newAvgDays,
      newOrderCount,
    );
  }
}
