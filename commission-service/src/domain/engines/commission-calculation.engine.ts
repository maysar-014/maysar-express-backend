/**
 * Commission Calculation Engine
 * Pure business logic for calculating commissions based on business rules
 */

import { CommissionAmount, CommissionRate } from '../value-objects/monetary.value-object';
import { CommissionType, RewardType } from '../value-objects/commission-types.value-object';
import { RecipientType } from '../value-objects/recipient-types.value-object';

export interface CommissionCalculationInput {
  orderAmount: CommissionAmount;
  recipientType: RecipientType;
  commissionType: CommissionType;
  baseRate?: CommissionRate;
  performanceBonus?: number;
  qualityMetrics?: {
    rating?: number;
    onTimeDelivery?: boolean;
    customerSatisfaction?: number;
  };
  specialConditions?: {
    firstOrder?: boolean;
    bulkOrder?: boolean;
    promotionalPeriod?: boolean;
  };
}

export interface CommissionCalculationResult {
  baseCommission: CommissionAmount;
  bonus: CommissionAmount;
  totalCommission: CommissionAmount;
  appliedRate: CommissionRate;
  breakdown: {
    baseAmount: CommissionAmount;
    performanceBonus: CommissionAmount;
    qualityBonus: CommissionAmount;
    specialBonus: CommissionAmount;
  };
}

export class CommissionCalculationEngine {
  /**
   * Calculate commission based on business rules
   */
  static calculateCommission(input: CommissionCalculationInput): CommissionCalculationResult {
    const appliedRate = this.determineCommissionRate(input);
    const baseCommission = appliedRate.applyTo(input.orderAmount);

    const performanceBonus = this.calculatePerformanceBonus(input);
    const qualityBonus = this.calculateQualityBonus(input);
    const specialBonus = this.calculateSpecialBonuses(input);

    const totalBonus = performanceBonus.add(qualityBonus).add(specialBonus);
    const totalCommission = baseCommission.add(totalBonus);

    return {
      baseCommission,
      bonus: totalBonus,
      totalCommission,
      appliedRate,
      breakdown: {
        baseAmount: baseCommission,
        performanceBonus,
        qualityBonus,
        specialBonus
      }
    };
  }

  /**
   * Determine the commission rate based on recipient type and conditions
   */
  private static determineCommissionRate(input: CommissionCalculationInput): CommissionRate {
    if (input.baseRate) {
      return input.baseRate;
    }

    const baseRates: Record<RecipientType, Record<CommissionType, number>> = {
      [RecipientType.SELLER]: {
        [CommissionType.SALE]: 0.08, // 8%
        [CommissionType.REFERRAL]: 0.05, // 5%
        [CommissionType.BONUS]: 0.02, // 2%
        [CommissionType.ADJUSTMENT]: 0.00, // 0%
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      },
      [RecipientType.COURIER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.00,
        [CommissionType.BONUS]: 0.00,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      },
      [RecipientType.ENABLER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.00,
        [CommissionType.BONUS]: 0.00,
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.15, // 15%
        [CommissionType.TASK_COMPLETION]: 0.20, // 20%
        [CommissionType.COLLABORATION_SETUP]: 0.10 // 10%
      },
      [RecipientType.CUSTOMER]: {
        [CommissionType.SALE]: 0.00,
        [CommissionType.REFERRAL]: 0.03, // 3%
        [CommissionType.BONUS]: 0.01, // 1%
        [CommissionType.ADJUSTMENT]: 0.00,
        [CommissionType.TASK_ASSIGNMENT]: 0.00,
        [CommissionType.TASK_COMPLETION]: 0.00,
        [CommissionType.COLLABORATION_SETUP]: 0.00
      }
    };

    const rate = baseRates[input.recipientType]?.[input.commissionType] ?? 0;
    return CommissionRate.fromDecimal(rate);
  }

  /**
   * Calculate performance-based bonuses
   */
  private static calculatePerformanceBonus(input: CommissionCalculationInput): CommissionAmount {
    if (!input.performanceBonus) return CommissionAmount.zero();

    const baseCommission = this.determineCommissionRate(input).applyTo(input.orderAmount);
    const bonusAmount = baseCommission.multiply(input.performanceBonus);

    return bonusAmount;
  }

  /**
   * Calculate quality-based bonuses
   */
  private static calculateQualityBonus(input: CommissionCalculationInput): CommissionAmount {
    if (!input.qualityMetrics) return CommissionAmount.zero();

    let bonusMultiplier = 0;

    // Rating bonus (4.8+ rating = 5% bonus, 5.0 rating = 10% bonus)
    if (input.qualityMetrics.rating) {
      if (input.qualityMetrics.rating >= 4.8) {
        bonusMultiplier += 0.05;
      }
      if (input.qualityMetrics.rating === 5.0) {
        bonusMultiplier += 0.05; // Additional 5% for perfect rating
      }
    }

    // On-time delivery bonus (5% bonus)
    if (input.qualityMetrics.onTimeDelivery) {
      bonusMultiplier += 0.05;
    }

    // Customer satisfaction bonus
    if (input.qualityMetrics.customerSatisfaction) {
      if (input.qualityMetrics.customerSatisfaction >= 4.5) {
        bonusMultiplier += 0.03;
      }
    }

    const baseCommission = this.determineCommissionRate(input).applyTo(input.orderAmount);
    return baseCommission.multiply(bonusMultiplier);
  }

  /**
   * Calculate special condition bonuses
   */
  private static calculateSpecialBonuses(input: CommissionCalculationInput): CommissionAmount {
    if (!input.specialConditions) return CommissionAmount.zero();

    let bonusAmount = CommissionAmount.zero();

    // First order bonus
    if (input.specialConditions.firstOrder) {
      bonusAmount = bonusAmount.add(CommissionAmount.fromNumber(50)); // Fixed $50 bonus
    }

    // Bulk order bonus (assume > $1000 is bulk)
    if (input.specialConditions.bulkOrder && input.orderAmount.toNumber() > 1000) {
      const bulkBonus = input.orderAmount.multiply(0.02); // 2% of order amount
      bonusAmount = bonusAmount.add(bulkBonus);
    }

    // Promotional period bonus
    if (input.specialConditions.promotionalPeriod) {
      const promoBonus = input.orderAmount.multiply(0.01); // 1% additional
      bonusAmount = bonusAmount.add(promoBonus);
    }

    return bonusAmount;
  }

  /**
   * Calculate reward amounts for different reward types
   */
  static calculateRewardAmount(
    type: RewardType,
    baseAmount: CommissionAmount,
    recipientType: RecipientType
  ): CommissionAmount {
    const rewardMultipliers: Record<RewardType, Record<RecipientType, number>> = {
      [RewardType.REFERRAL]: {
        [RecipientType.SELLER]: 0.05, // 5% of referral commission
        [RecipientType.COURIER]: 0.03, // 3% of referral commission
        [RecipientType.ENABLER]: 0.04, // 4% of referral commission
        [RecipientType.CUSTOMER]: 0.10 // 10% of referral commission
      },
      [RewardType.LOYALTY]: {
        [RecipientType.SELLER]: 0.02, // 2% loyalty bonus
        [RecipientType.COURIER]: 0.015, // 1.5% loyalty bonus
        [RecipientType.ENABLER]: 0.025, // 2.5% loyalty bonus
        [RecipientType.CUSTOMER]: 0.05 // 5% loyalty bonus
      },
      [RewardType.BONUS]: {
        [RecipientType.SELLER]: 0.03, // 3% performance bonus
        [RecipientType.COURIER]: 0.025, // 2.5% performance bonus
        [RecipientType.ENABLER]: 0.035, // 3.5% performance bonus
        [RecipientType.CUSTOMER]: 0.02 // 2% bonus
      },
      [RewardType.MILESTONE]: {
        [RecipientType.SELLER]: 0.10, // 10% milestone bonus
        [RecipientType.COURIER]: 0.08, // 8% milestone bonus
        [RecipientType.ENABLER]: 0.12, // 12% milestone bonus
        [RecipientType.CUSTOMER]: 0.15 // 15% milestone bonus
      },
      [RewardType.PROMOTIONAL]: {
        [RecipientType.SELLER]: 0.05, // 5% promotional bonus
        [RecipientType.COURIER]: 0.04, // 4% promotional bonus
        [RecipientType.ENABLER]: 0.06, // 6% promotional bonus
        [RecipientType.CUSTOMER]: 0.08 // 8% promotional bonus
      }
    };

    const multiplier = rewardMultipliers[type]?.[recipientType] ?? 0;
    return baseAmount.multiply(multiplier);
  }
}
