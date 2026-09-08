/**
 * FairnessEngine tests (Phase 6 §6.1) + buyer-profile ranking effect (§6.3)
 */

import { FairnessEngine } from '../fairness.engine';
import { OptionRankingEngine } from '../option-ranking.engine';
import { FulfillmentOption, FulfillmentOptionType } from '../fulfillment-option.engine';

const THRESHOLDS = { maxBuyerPriceRatio: 1.5, minimumDriverHourlyRateTzs: 3000 };

const HEALTHY = {
  buyerPriceTzs: 6000,
  fulfillmentCostTzs: 5000, // ratio 1.2 ≤ 1.5
  driverCompensationTzs: 3500, // 3500 / 1h ≥ 3000
  estimatedActiveHours: 1,
  supplierAttributedChargesTzs: 0,
  maysarMarginTzs: 1000, // ≥ 0
};

describe('FairnessEngine', () => {
  const engine = new FairnessEngine();

  it('passes a fair option on all four checks', () => {
    const report = engine.evaluate(HEALTHY, THRESHOLDS);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  it('flags BUYER_PRICE_RATIO when the buyer overpays vs economic cost', () => {
    const report = engine.evaluate({ ...HEALTHY, buyerPriceTzs: 9000 }, THRESHOLDS); // 9000/5000 = 1.8
    expect(report.passed).toBe(false);
    const v = report.violations.find(x => x.checkType === 'BUYER_PRICE_RATIO');
    expect(v).toBeDefined();
    expect(v!.computedValue).toBe(1.8);
    expect(v!.threshold).toBe(1.5);
  });

  it('flags DRIVER_EARNINGS when the hourly rate falls below minimum', () => {
    const report = engine.evaluate(
      { ...HEALTHY, driverCompensationTzs: 3000, estimatedActiveHours: 2 }, // 1500/h
      THRESHOLDS,
    );
    const v = report.violations.find(x => x.checkType === 'DRIVER_EARNINGS');
    expect(v).toBeDefined();
    expect(v!.computedValue).toBe(1500);
    expect(v!.threshold).toBe(3000);
  });

  it('flags SUPPLIER_ATTRIBUTION when supplier-caused costs reach the buyer', () => {
    const report = engine.evaluate({ ...HEALTHY, supplierAttributedChargesTzs: 1200 }, THRESHOLDS);
    const v = report.violations.find(x => x.checkType === 'SUPPLIER_ATTRIBUTION');
    expect(v).toBeDefined();
    expect(v!.computedValue).toBe(1200);
    expect(v!.threshold).toBe(0);
  });

  it('flags MAYSAR_SUSTAINABILITY when the platform subsidizes a loss', () => {
    const report = engine.evaluate(
      { ...HEALTHY, buyerPriceTzs: 4000, fulfillmentCostTzs: 5000, maysarMarginTzs: undefined },
      THRESHOLDS,
    );
    const v = report.violations.find(x => x.checkType === 'MAYSAR_SUSTAINABILITY');
    expect(v).toBeDefined();
    expect(v!.computedValue).toBe(-1000);
    expect(v!.threshold).toBe(0);
  });

  it('collects multiple violations in one report (escalated, not silent)', () => {
    const report = engine.evaluate(
      {
        buyerPriceTzs: 12000,      // ratio 2.4 — violated
        fulfillmentCostTzs: 5000,
        driverCompensationTzs: 1000, // 500/h — violated
        estimatedActiveHours: 2,
        supplierAttributedChargesTzs: 800, // violated
        maysarMarginTzs: undefined, // 12000-5000 = 7000 — fine
      },
      THRESHOLDS,
    );
    expect(report.passed).toBe(false);
    expect(report.violations.map(v => v.checkType).sort()).toEqual([
      'BUYER_PRICE_RATIO', 'DRIVER_EARNINGS', 'SUPPLIER_ATTRIBUTION',
    ]);
  });
});

// ─── Buyer-profile ranking integration (§6.3) ────────────────────────────────

function option(overrides: Partial<FulfillmentOption> = {}): FulfillmentOption {
  const now = new Date('2026-09-06T09:00:00Z');
  return {
    optionType: 'MAYSAR_EXPRESS' as FulfillmentOptionType,
    fulfillmentPlanId: 'plan-1',
    shipmentIds: ['shp-1'],
    sellerCount: 1,
    estimatedPickupAt: now,
    estimatedDeliveryAt: now,
    deliveryWindow: 'STANDARD',
    buyerPriceTzs: 6000,
    driverCompensationTzs: 3500,
    maysarMarginTzs: 1000,
    fulfillmentCostTzs: 5000,
    driverMeetsMinimumEarnings: true,
    flexibleWindowDiscountApplied: false,
    distanceKm: 8,
    deliveryZone: 'metro',
    ...overrides,
  };
}

const WEIGHTS = {
  buyerCostWeight: 0.35,
  deliveryTimeWeight: 0.25,
  vehicleUtilizationWeight: 0.15,
  failureRiskWeight: 0.10,
  driverEfficiencyWeight: 0.10,
  maysarMarginWeight: 0.05,
};

describe('OptionRankingEngine buyer-profile integration (§6.3)', () => {
  const ranker = new OptionRankingEngine();

  it('gives a 95%-success buyer a lower failure probability than a 60%-success buyer', () => {
    const reliable = ranker.rank([option()], WEIGHTS, { deliverySuccessRate: 0.95 })[0];
    const risky = ranker.rank([option()], WEIGHTS, { deliverySuccessRate: 0.6 })[0];
    expect(reliable.scoreComponents.failureProbabilityScore)
      .toBeLessThan(risky.scoreComponents.failureProbabilityScore);
  });

  it('defaults to the new-buyer 0.80 success rate when no profile exists', () => {
    const withDefault = ranker.rank([option()], WEIGHTS)[0];
    const explicitDefault = ranker.rank([option()], WEIGHTS, { deliverySuccessRate: 0.8 })[0];
    expect(withDefault.scoreComponents.failureProbabilityScore)
      .toBe(explicitDefault.scoreComponents.failureProbabilityScore);
  });

  it('a higher-risk buyer sees a lower overall score (reliability ranking effect)', () => {
    const reliable = ranker.rank([option()], WEIGHTS, { deliverySuccessRate: 0.95 })[0];
    const risky = ranker.rank([option()], WEIGHTS, { deliverySuccessRate: 0.6 })[0];
    expect(reliable.score).toBeGreaterThan(risky.score);
  });
});

