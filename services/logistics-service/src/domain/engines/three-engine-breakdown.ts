/**
 * Three-engine quote breakdown (Phase 3 §3.1)
 *
 * The composite breakdown stored on a Quote when it was priced by the
 * three-engine pipeline (FulfillmentCostEngine → DriverCompensationEngine →
 * BuyerPriceEngine) instead of the interim 11-stage pipeline.
 *
 * Extended by MYS-DEL-001 Article 4.6: the FinancialFeasibilityEngine result
 * is now a mandatory fourth field on every three-engine breakdown. A quote
 * produced by the three-engine path that has not been evaluated by the
 * feasibility engine is incomplete.
 */

import { FulfillmentCostBreakdown } from './fulfillment-cost.engine';
import { DriverCompensationBreakdown } from './driver-compensation.engine';
import { LogisticsPriceBreakdown } from './buyer-price.engine';
import { FeasibilityResult } from './financial-feasibility.engine';

export interface ThreeEngineQuoteBreakdown {
  engineVersion: 'three-engine-v1';
  fulfillmentCost: FulfillmentCostBreakdown;
  driverCompensation: DriverCompensationBreakdown;
  buyerPrice: LogisticsPriceBreakdown;
  /**
   * Financial feasibility result (MYS-DEL-001 Article 4.6 / Article 30).
   * Null only when the feasibility engine was bypassed on a fallback path —
   * this case must generate a warning and classify the quote as UNVERIFIED.
   */
  feasibility: FeasibilityResult | null;
}