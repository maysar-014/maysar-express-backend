/**
 * BuyerProfileService (Phase 6 §6.3)
 *
 * Maintains the per-buyer logistics behavior record and exposes the risk
 * profile consumed by the OptionRankingEngine's failure-probability score.
 * Updated on each DeliveryConfirmed / DeliveryFailed event.
 */

import { BuyerProfileRepository, BuyerDeliveryOutcome } from '../../domain/repositories/buyer-profile.repository';

export class BuyerProfileService {
  constructor(private readonly repo: BuyerProfileRepository) {}

  /** Risk profile for ranking; new buyers default to 0.80 (backlog §6.3). */
  async getRiskProfile(buyerId: string | undefined): Promise<{ deliverySuccessRate: number }> {
    if (!buyerId) return { deliverySuccessRate: 0.8 };
    const profile = await this.repo.findByBuyerId(buyerId).catch(() => null);
    if (!profile) return { deliverySuccessRate: 0.8 };
    return { deliverySuccessRate: Number(profile.deliverySuccessRate) };
  }

  /**
   * Records a delivery outcome and recomputes the rolling success rate.
   * Non-throwing: behavior tracking must never break the delivery flow.
   */
  async recordDeliveryOutcome(buyerId: string, outcome: BuyerDeliveryOutcome): Promise<void> {
    try {
      await this.repo.recordOutcome(buyerId, outcome);
    } catch (err: any) {
      console.error('[BuyerProfileService] recordOutcome failed (non-fatal):', err?.message);
    }
  }
}
