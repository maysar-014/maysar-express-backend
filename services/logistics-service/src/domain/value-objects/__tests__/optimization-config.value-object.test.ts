/**
 * OptimizationConfig value object tests (Phase 4 §4.2)
 *
 * Weight-sum-to-1 validation, versioned/no-overwrite invariant, and the
 * default balanced weights.
 */

import { OptimizationConfig } from '../optimization-config.value-object';

describe('OptimizationConfig', () => {
  it('accepts weights that sum to 1', () => {
    const c = OptimizationConfig.create({ weights: OptimizationConfig.defaultWeights() });
    expect(c.isActive).toBe(true);
    const w = c.weights;
    const sum = w.buyerCostWeight + w.deliveryTimeWeight + w.vehicleUtilizationWeight
      + w.failureRiskWeight + w.driverEfficiencyWeight + w.maysarMarginWeight;
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it('defaults to version 1 and carries the Phase 3 CostVariancePolicy fields', () => {
    const c = OptimizationConfig.create({
      weights: OptimizationConfig.defaultWeights(),
      variancePolicy: { maysarAbsorbsUpToTzs: 5000, customerChargeableVarianceTypes: ['FAILED_DELIVERY_ATTEMPT'] },
    });
    expect(c.version).toBe(1);
    expect(c.variancePolicy.maysarAbsorbsUpToTzs).toBe(5000);
    expect(c.variancePolicy.customerChargeableVarianceTypes).toEqual(['FAILED_DELIVERY_ATTEMPT']);
  });

  it('REJECTS weights that do not sum to 1', () => {
    expect(() => OptimizationConfig.create({
      weights: { buyerCostWeight: 0.5, deliveryTimeWeight: 0.5, vehicleUtilizationWeight: 0.3, failureRiskWeight: 0, driverEfficiencyWeight: 0, maysarMarginWeight: 0 },
    })).toThrow(/sum to 1/);  });

  it('rejects out-of-range weights and negative maysarAbsorbsUpToTzs', () => {
    const w = OptimizationConfig.defaultWeights();
    expect(() => OptimizationConfig.create({ weights: { ...w, buyerCostWeight: 1.5 } })).toThrow(/must be in \[0, 1\]/);
    expect(() => OptimizationConfig.create({ weights: w, variancePolicy: { maysarAbsorbsUpToTzs: -1 } })).toThrow(/cannot be negative/);
  });
});