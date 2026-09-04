/**
 * BuyerPriceEngine (Phase 3 §3.1)
 *
 * Takes the FulfillmentCostBreakdown + MaysarServiceFeeConfig + applicable
 * discounts and produces the buyer's logistics price. **The only place Maysar
 * margin is calculated.**
 *
 *   Buyer Logistics Price = Fulfillment Cost + Maysar Margin − Discounts
 *
 * Pure and stateless: no async, no I/O, no side effects. Deterministic.
 */

import { FulfillmentCostBreakdown } from './fulfillment-cost.engine';

export interface MaysarServiceFeeConfig {
  /** Margin as a fraction of the fulfillment cost (0.0–1.0). */
  marginPct: number;
  /** Round the final buyer price up to this increment (optional). */
  roundingIncrementTzs?: number;
}

export interface BuyerPriceInput {
  fulfillmentCost: FulfillmentCostBreakdown;
  serviceFee: MaysarServiceFeeConfig;
  /** Applicable discount in TZS (e.g. FLEXIBLE-window discount). */
  discountTzs?: number;
}

export interface LogisticsPriceBreakdown {
  fulfillmentCostTzs: number;
  maysarMarginTzs: number;
  discountAmountTzs: number;
  finalBuyerPriceTzs: number;
}

export class BuyerPriceEngine {
  compute(input: BuyerPriceInput): LogisticsPriceBreakdown {
    const { marginPct } = input.serviceFee;
    if (!(marginPct >= 0 && marginPct <= 1)) {
      throw new Error(`BuyerPriceEngine: marginPct must be within [0, 1] (got ${marginPct})`);
    }
    const discount = input.discountTzs ?? 0;
    if (discount < 0) throw new Error('BuyerPriceEngine: discountTzs cannot be negative');

    const fulfillmentCostTzs = input.fulfillmentCost.totalFulfillmentCostTzs;

    // Maysar margin — calculated here and nowhere else.
    const maysarMarginTzs = Math.round(fulfillmentCostTzs * marginPct);

    // Discount can never drive the buyer price below zero.
    const discountAmountTzs = Math.min(discount, fulfillmentCostTzs + maysarMarginTzs);

    let finalBuyerPriceTzs = fulfillmentCostTzs + maysarMarginTzs - discountAmountTzs;

    const increment = input.serviceFee.roundingIncrementTzs;
    if (increment && increment > 0) {
      finalBuyerPriceTzs = Math.ceil(finalBuyerPriceTzs / increment) * increment;
    }

    return {
      fulfillmentCostTzs,
      maysarMarginTzs,
      discountAmountTzs,
      finalBuyerPriceTzs,
    };
  }
}