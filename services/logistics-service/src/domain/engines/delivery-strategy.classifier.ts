/**
 * DeliveryStrategyClassifier
 *
 * Classifies a delivery request into one of two fulfillment strategies:
 *
 *   LOCAL_URBAN  — same ward, same district, or same region (within ~50 km)
 *                  Fulfilled by a local motorcycle/tuk-tuk courier.
 *                  Pricing: distance-band based, NO separate time charge.
 *
 *   INTERCITY    — cross-region delivery
 *                  Fulfilled via intercity bus/freight lines.
 *                  Pricing: corridor-based flat + weight charge.
 *
 * A third future strategy (REMOTE) can be added without modifying this classifier's
 * callers — the pricing engine handles each strategy independently.
 */

import { DeliveryZone } from '../services/zone-classifier';

export type DeliveryStrategy = 'LOCAL_URBAN' | 'INTERCITY';

export interface StrategyClassificationResult {
  strategy: DeliveryStrategy;
  /** Straight-line distance in km (for band selection). Road distance used in cost calc. */
  straightDistanceKm?: number;
}

export class DeliveryStrategyClassifier {
  /**
   * Classify the delivery strategy from the resolved geographic zone.
   *
   * LOCAL_URBAN:  same_ward | same_district | same_region
   * INTERCITY:    cross_region
   */
  classify(zone: DeliveryZone): StrategyClassificationResult {
    switch (zone) {
      case 'same_ward':
      case 'same_district':
      case 'same_region':
        return { strategy: 'LOCAL_URBAN' };

      case 'cross_region':
        return { strategy: 'INTERCITY' };

      default:
        return { strategy: 'INTERCITY' }; // conservative fallback
    }
  }
}
