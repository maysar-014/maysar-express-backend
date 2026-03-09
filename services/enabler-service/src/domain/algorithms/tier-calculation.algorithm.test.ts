import { Enabler_Tier } from '../types/enabler.types';
import { TierCalculationAlgorithm } from './tier-calculation.algorithm';

describe('TierCalculationAlgorithm', () => {
  it('forces bronze when dispute rate is too high', () => {
    const tier = TierCalculationAlgorithm.calculateRecommendedTier({
      totalSales: 200000,
      totalOrders: 500,
      conversionRate: 0.9,
      customerRating: 5,
      disputeRate: 0.2,
      daysActive: 365
    });

    expect(tier).toBe(Enabler_Tier.BRONZE);
  });

  it('selects platinum/gold/silver based on thresholds', () => {
    const platinum = TierCalculationAlgorithm.calculateRecommendedTier({
      totalSales: 100000,
      totalOrders: 200,
      conversionRate: 0.5,
      customerRating: 4.8,
      disputeRate: 0.01,
      daysActive: 180
    });
    const gold = TierCalculationAlgorithm.calculateRecommendedTier({
      totalSales: 50000,
      totalOrders: 150,
      conversionRate: 0.4,
      customerRating: 4.5,
      disputeRate: 0.01,
      daysActive: 90
    });
    const silver = TierCalculationAlgorithm.calculateRecommendedTier({
      totalSales: 10000,
      totalOrders: 80,
      conversionRate: 0.3,
      customerRating: 4.0,
      disputeRate: 0.01,
      daysActive: 30
    });

    expect(platinum).toBe(Enabler_Tier.PLATINUM);
    expect(gold).toBe(Enabler_Tier.GOLD);
    expect(silver).toBe(Enabler_Tier.SILVER);
  });

  it('returns bronze when none of higher tiers are met', () => {
    const tier = TierCalculationAlgorithm.calculateRecommendedTier({
      totalSales: 5000,
      totalOrders: 20,
      conversionRate: 0.2,
      customerRating: 3.8,
      disputeRate: 0.01,
      daysActive: 10
    });

    expect(tier).toBe(Enabler_Tier.BRONZE);
  });
});

