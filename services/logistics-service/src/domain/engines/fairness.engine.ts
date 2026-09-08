/**
 * FairnessEngine (Phase 6 §6.1)
 *
 * Validates every generated FulfillmentOption against four checks before it
 * can be returned to the buyer:
 *
 *   BUYER_PRICE_RATIO      buyerPriceTzs / fulfillmentCostTzs
 *                          <= config.maxBuyerPriceRatio
 *                          — the buyer is not paying substantially more than
 *                            the economic cost of the delivery
 *   DRIVER_EARNINGS        driverCompensationTzs / estimatedActiveHours
 *                          >= config.minimumDriverHourlyRateTzs
 *   SUPPLIER_ATTRIBUTION   no adjustment attributed to SUPPLIER is charged to
 *                          the buyer (supplierAttributedChargesTzs === 0)
 *   MAYSAR_SUSTAINABILITY  maysarMarginTzs >= 0 — the platform is not
 *                          subsidizing a loss on this transaction
 *
 * PURE — no I/O, no async. The caller persists a Logistics_FairnessFlag row
 * for every violation and escalates it to ops: flagged options are removed
 * from the buyer's list but never silently (backlog rule 9).
 */

export type FairnessCheckType =
  | 'BUYER_PRICE_RATIO'
  | 'DRIVER_EARNINGS'
  | 'SUPPLIER_ATTRIBUTION'
  | 'MAYSAR_SUSTAINABILITY';

export interface FairnessThresholds {
  /** Max allowed buyerPrice / fulfillmentCost (e.g. 1.5). */
  maxBuyerPriceRatio: number;
  /** Minimum TZS per active hour the driver must earn. */
  minimumDriverHourlyRateTzs: number;
}

export interface FairnessInput {
  buyerPriceTzs: number;
  fulfillmentCostTzs: number;
  driverCompensationTzs: number;
  /** Driver's estimated active hours for this fulfillment (pickup→delivery). */
  estimatedActiveHours: number;
  /** Sum of CostAdjustment amounts attributed to SUPPLIER passed to buyer. */
  supplierAttributedChargesTzs: number;
  /** Explicit margin; defaults to buyerPrice − fulfillmentCost when omitted. */
  maysarMarginTzs?: number;
}

export interface FairnessViolation {
  checkType: FairnessCheckType;
  computedValue: number;
  threshold: number;
  detail: string;
}

export interface FairnessReport {
  passed: boolean;
  violations: FairnessViolation[];
}

export class FairnessEngine {
  evaluate(input: FairnessInput, thresholds: FairnessThresholds): FairnessReport {
    const violations: FairnessViolation[] = [];

    // 1. Buyer fairness — price vs economic cost.
    const costFloor = Math.max(1, input.fulfillmentCostTzs);
    const buyerPriceRatio = input.buyerPriceTzs / costFloor;
    if (buyerPriceRatio > thresholds.maxBuyerPriceRatio) {
      violations.push({
        checkType: 'BUYER_PRICE_RATIO',
        computedValue: Math.round(buyerPriceRatio * 10000) / 10000,
        threshold: thresholds.maxBuyerPriceRatio,
        detail: `Buyer pays ${buyerPriceRatio.toFixed(2)}× the fulfillment cost (max ${thresholds.maxBuyerPriceRatio})`,
      });
    }

    // 2. Driver fairness — hourly rate vs minimum.
    const activeHours = Math.max(1 / 60, input.estimatedActiveHours);
    const driverHourlyRateTzs = input.driverCompensationTzs / activeHours;
    if (driverHourlyRateTzs < thresholds.minimumDriverHourlyRateTzs) {
      violations.push({
        checkType: 'DRIVER_EARNINGS',
        computedValue: Math.round(driverHourlyRateTzs),
        threshold: thresholds.minimumDriverHourlyRateTzs,
        detail: `Driver earns ${Math.round(driverHourlyRateTzs)} TZS/h (min ${thresholds.minimumDriverHourlyRateTzs})`,
      });
    }

    // 3. Supplier fairness — supplier-caused costs are never buyer's burden.
    if (input.supplierAttributedChargesTzs > 0) {
      violations.push({
        checkType: 'SUPPLIER_ATTRIBUTION',
        computedValue: input.supplierAttributedChargesTzs,
        threshold: 0,
        detail: `${input.supplierAttributedChargesTzs} TZS of supplier-attributed cost charged to buyer`,
      });
    }

    // 4. Maysar sustainability — platform never subsidizes a loss.
    const maysarMarginTzs = input.maysarMarginTzs ?? input.buyerPriceTzs - input.fulfillmentCostTzs;
    if (maysarMarginTzs < 0) {
      violations.push({
        checkType: 'MAYSAR_SUSTAINABILITY',
        computedValue: maysarMarginTzs,
        threshold: 0,
        detail: `Maysar subsidizes a ${maysarMarginTzs} TZS loss on this option`,
      });
    }

    return { passed: violations.length === 0, violations };
  }
}
