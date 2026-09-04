/**
 * Three-engine quote breakdown (Phase 3 §3.1)
 *
 * The composite breakdown stored on a Quote when it was priced by the
 * three-engine pipeline (FulfillmentCostEngine → DriverCompensationEngine →
 * BuyerPriceEngine) instead of the interim 11-stage pipeline.
 */

import { FulfillmentCostBreakdown } from './fulfillment-cost.engine';
import { DriverCompensationBreakdown } from './driver-compensation.engine';
import { LogisticsPriceBreakdown } from './buyer-price.engine';

export interface ThreeEngineQuoteBreakdown {
  engineVersion: 'three-engine-v1';
  fulfillmentCost: FulfillmentCostBreakdown;
  driverCompensation: DriverCompensationBreakdown;
  buyerPrice: LogisticsPriceBreakdown;
}