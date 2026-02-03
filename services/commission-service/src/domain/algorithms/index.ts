/**
 * Domain Algorithms
 * Pure computational functions for commission calculations
 */

import { CommissionAmount } from '../value-objects/monetary.value-object';

/**
 * Bonus calculation algorithms
 */
export class BonusCalculationAlgorithm {
  /**
   * Calculate performance bonus based on metrics
   */
  static calculatePerformanceBonus(
    baseAmount: CommissionAmount,
    performanceScore: number,
    targetScore: number = 0.8
  ): CommissionAmount {
    if (performanceScore <= targetScore) {
      return CommissionAmount.zero();
    }

    // Bonus increases linearly with performance above target
    const bonusMultiplier = Math.max(0, (performanceScore - targetScore) / (1 - targetScore));
    const maxBonusMultiplier = 0.5; // Max 50% bonus

    return baseAmount.multiply(Math.min(bonusMultiplier, maxBonusMultiplier));
  }

  /**
   * Calculate quality bonus based on rating and metrics
   */
  static calculateQualityBonus(
    baseAmount: CommissionAmount,
    rating: number,
    onTimeDelivery: boolean,
    customerSatisfaction: number
  ): CommissionAmount {
    let bonusMultiplier = 0;

    // Rating-based bonus
    if (rating >= 4.8) {
      bonusMultiplier += 0.05; // 5% for 4.8+
    }
    if (rating === 5.0) {
      bonusMultiplier += 0.05; // Additional 5% for perfect 5.0
    }

    // On-time delivery bonus
    if (onTimeDelivery) {
      bonusMultiplier += 0.05; // 5% bonus
    }

    // Customer satisfaction bonus
    if (customerSatisfaction >= 4.5) {
      bonusMultiplier += 0.03; // 3% bonus
    }

    return baseAmount.multiply(bonusMultiplier);
  }

  /**
   * Calculate volume bonus for high-volume sellers
   */
  static calculateVolumeBonus(
    monthlyVolume: number,
    baseAmount: CommissionAmount
  ): CommissionAmount {
    const volumeTiers = [
      { threshold: 10000, bonus: 0.02 }, // 2% bonus for $10k+
      { threshold: 50000, bonus: 0.05 }, // 5% bonus for $50k+
      { threshold: 100000, bonus: 0.08 } // 8% bonus for $100k+
    ];

    for (const tier of volumeTiers.reverse()) {
      if (monthlyVolume >= tier.threshold) {
        return baseAmount.multiply(tier.bonus);
      }
    }

    return CommissionAmount.zero();
  }

  /**
   * Calculate loyalty bonus based on tenure
   */
  static calculateLoyaltyBonus(
    monthsActive: number,
    baseAmount: CommissionAmount
  ): CommissionAmount {
    const loyaltyTiers = [
      { months: 6, bonus: 0.01 },  // 1% after 6 months
      { months: 12, bonus: 0.02 }, // 2% after 1 year
      { months: 24, bonus: 0.03 }, // 3% after 2 years
      { months: 36, bonus: 0.05 }  // 5% after 3 years
    ];

    for (const tier of loyaltyTiers.reverse()) {
      if (monthsActive >= tier.months) {
        return baseAmount.multiply(tier.bonus);
      }
    }

    return CommissionAmount.zero();
  }
}

/**
 * Commission rate calculation algorithms
 */
export class CommissionRateAlgorithm {
  /**
   * Calculate dynamic rate based on market conditions
   */
  static calculateDynamicRate(
    baseRate: number,
    marketDemand: number, // 0-1 scale
    competitionLevel: number, // 0-1 scale
    sellerPerformance: number // 0-1 scale
  ): number {
    // Adjust rate based on market conditions
    let adjustedRate = baseRate;

    // High demand increases rate (up to 20% increase)
    if (marketDemand > 0.7) {
      adjustedRate *= (1 + (marketDemand - 0.7) * 0.4);
    }

    // High competition decreases rate (up to 15% decrease)
    if (competitionLevel > 0.6) {
      adjustedRate *= (1 - (competitionLevel - 0.6) * 0.25);
    }

    // High seller performance increases rate (up to 10% increase)
    if (sellerPerformance > 0.8) {
      adjustedRate *= (1 + (sellerPerformance - 0.8) * 0.25);
    }

    // Ensure rate stays within bounds
    return Math.max(0.01, Math.min(0.5, adjustedRate));
  }

  /**
   * Calculate tiered rate based on order value
   */
  static calculateTieredRate(orderValue: number): number {
    const tiers = [
      { maxValue: 100, rate: 0.05 },   // 5% for orders up to $100
      { maxValue: 500, rate: 0.08 },   // 8% for orders $100-$500
      { maxValue: 1000, rate: 0.10 },  // 10% for orders $500-$1000
      { maxValue: 5000, rate: 0.12 },  // 12% for orders $1000-$5000
      { maxValue: Infinity, rate: 0.15 } // 15% for orders over $5000
    ];

    for (const tier of tiers) {
      if (orderValue <= tier.maxValue) {
        return tier.rate;
      }
    }

    return 0.15; // Fallback
  }

  /**
   * Calculate promotional rate with decay
   */
  static calculatePromotionalRate(
    baseRate: number,
    promotionStart: Date,
    currentDate: Date,
    promotionDuration: number, // days
    maxDiscount: number = 0.5 // Max 50% discount
  ): number {
    const daysElapsed = (currentDate.getTime() - promotionStart.getTime()) / (1000 * 60 * 60 * 24);
    const progress = Math.min(daysElapsed / promotionDuration, 1);

    // Rate decreases linearly over promotion period (from base to base * (1 - maxDiscount))
    const discount = maxDiscount * progress;
    return baseRate * (1 - discount);
  }

  /**
   * Calculate seasonal rate adjustment
   */
  static calculateSeasonalRate(
    baseRate: number,
    month: number, // 0-11
    peakMonths: number[] = [10, 11, 0], // Nov, Dec, Jan
    offPeakMonths: number[] = [5, 6, 7] // Jun, Jul, Aug
  ): number {
    if (peakMonths.includes(month)) {
      return baseRate * 1.2; // 20% increase during peak
    }
    if (offPeakMonths.includes(month)) {
      return baseRate * 0.9; // 10% decrease during off-peak
    }
    return baseRate;
  }
}

/**
 * Payout scheduling algorithms
 */
export class PayoutSchedulingAlgorithm {
  /**
   * Calculate optimal payout date based on commission amount and risk
   */
  static calculateOptimalPayoutDate(
    commissionAmount: number,
    commissionAge: number, // days
    recipientRiskScore: number, // 0-1 scale
    minHoldingPeriod: number = 1, // days
    maxHoldingPeriod: number = 30 // days
  ): Date {
    // Base holding period
    let holdingPeriod = minHoldingPeriod;

    // Increase holding for high-risk recipients
    if (recipientRiskScore > 0.7) {
      holdingPeriod += 7; // Additional 7 days for high risk
    }

    // Increase holding for large amounts
    if (commissionAmount > 1000) {
      holdingPeriod += Math.floor(commissionAmount / 1000) * 2; // 2 days per $1000
    }

    // Cap at maximum
    holdingPeriod = Math.min(holdingPeriod, maxHoldingPeriod);

    // Calculate payout date
    const payoutDate = new Date();
    payoutDate.setDate(payoutDate.getDate() + holdingPeriod);

    return payoutDate;
  }

  /**
   * Batch commissions for efficient payout processing
   */
  static batchCommissionsForPayout(
    commissions: Array<{ id: string; amount: number; recipientId: string; age: number }>,
    maxBatchSize: number = 100,
    maxBatchAmount: number = 50000
  ): Array<Array<{ id: string; amount: number; recipientId: string; age: number }>> {
    const batches: Array<Array<any>> = [];
    let currentBatch: Array<any> = [];
    let currentBatchAmount = 0;

    // Sort by age (oldest first) and amount (largest first for efficiency)
    const sortedCommissions = commissions
      .sort((a, b) => {
        if (a.age !== b.age) return b.age - a.age; // Older first
        return b.amount - a.amount; // Larger first
      });

    for (const commission of sortedCommissions) {
      // Check if adding this commission would exceed limits
      if (
        currentBatch.length >= maxBatchSize ||
        currentBatchAmount + commission.amount > maxBatchAmount
      ) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchAmount = 0;
        }
      }

      currentBatch.push(commission);
      currentBatchAmount += commission.amount;
    }

    // Add remaining batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Calculate payout priority score
   */
  static calculatePayoutPriority(
    commissionAmount: number,
    commissionAge: number,
    recipientType: string,
    recipientReliability: number // 0-1 scale
  ): number {
    let priority = 0;

    // Age factor (older = higher priority)
    priority += Math.min(commissionAge / 30, 1) * 40; // Max 40 points

    // Amount factor (larger = higher priority)
    priority += Math.min(commissionAmount / 1000, 1) * 30; // Max 30 points

    // Recipient type factor
    const typeMultipliers: Record<string, number> = {
      'seller': 1.0,
      'courier': 1.2, // Higher priority for couriers
      'enabler': 1.1,
      'customer': 0.9
    };
    priority *= typeMultipliers[recipientType] || 1.0;

    // Reliability factor
    priority *= (0.5 + recipientReliability * 0.5); // 0.5x to 1.0x multiplier

    return Math.round(priority);
  }
}
