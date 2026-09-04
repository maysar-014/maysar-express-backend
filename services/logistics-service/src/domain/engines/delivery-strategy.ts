/**
 * DeliveryStrategy
 *
 * Classifies a delivery operation into one of four strategy tiers.
 * Each strategy uses a fundamentally different cost model — they are not
 * just the same formula with different multipliers.
 *
 *  LOCAL_URBAN   — Same district, ≤ 20 km. Motorcycle courier.
 *                  Distance-band model. Time is operational only.
 *  METROPOLITAN  — Same region, 20–80 km. Motorcycle or van courier.
 *                  Distance-band with extended bands.
 *  INTERCITY     — Cross-region, 80–600 km. Line-haul transport.
 *                  Corridor model: origin handling + line-haul + destination last-mile.
 *  REMOTE        — Cross-region > 600 km, or very remote areas.
 *                  ⚠️  NOT INDEPENDENTLY IMPLEMENTED IN v2.
 *                  Currently falls back to the intercityFallback corridor config
 *                  (if remoteUnavailable = false) or returns DELIVERY_UNAVAILABLE
 *                  (if remoteUnavailable = true).
 *                  Remote logistics (e.g. island deliveries, road-inaccessible areas)
 *                  requires dedicated corridor configs and separate fulfillment
 *                  partnerships before it can be properly priced. This is an
 *                  extension point for a future v3 remote delivery strategy.
 */

import { DeliveryZone } from '../services/zone-classifier';

export type DeliveryStrategy =
  | 'LOCAL_URBAN'
  | 'METROPOLITAN'
  | 'INTERCITY'
  | 'REMOTE';

/**
 * Resolve the delivery strategy from zone classification and route distance.
 *
 * This is the single authoritative function for strategy selection.
 * All other components must respect this classification.
 */
export function resolveDeliveryStrategy(
  zone: DeliveryZone,
  distanceKm: number,
): DeliveryStrategy {
  if (zone === 'same_ward' || zone === 'same_district') {
    if (distanceKm <= 20) return 'LOCAL_URBAN';
    if (distanceKm <= 80) return 'METROPOLITAN';
    return 'INTERCITY';
  }

  if (zone === 'same_region') {
    if (distanceKm <= 80) return 'METROPOLITAN';
    return 'INTERCITY';
  }

  // cross_region
  if (distanceKm <= 80) return 'METROPOLITAN'; // neighbouring regions close together
  if (distanceKm <= 600) return 'INTERCITY';
  return 'REMOTE';
}
