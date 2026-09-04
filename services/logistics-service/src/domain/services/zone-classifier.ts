/**
 * ZoneClassifier
 *
 * Classifies an origin–destination pair into a DeliveryZone using the
 * TanzaniaLocationIndex. The zone determines the zone multiplier applied in
 * stage 5 of the DeliveryPricingEngine pipeline.
 *
 * Zone hierarchy (most specific → least specific):
 *   same_ward      Both points are in the same ward
 *   same_district  Both points are in the same district (different wards)
 *   same_region    Both points are in the same region (different districts)
 *   cross_region   Points are in different regions
 *
 * DELIVERY_UNAVAILABLE is returned only when both points resolve to null
 * locality names (i.e., coordinates are outside any known Tanzania location).
 * A zero delivery fee means FREE delivery — not unavailability.
 */

import { GeoPoint } from '../value-objects/geopoint.value-object';
import { getLocalitySummary } from '../../infrastructure/providers/local-tanzania-locations';

export type DeliveryZone =
  | 'same_ward'
  | 'same_district'
  | 'same_region'
  | 'cross_region';

export interface ZoneClassificationResult {
  zone: DeliveryZone | null;
  unavailable: boolean;
  reason?: string;
  /** Origin region name for corridor lookup */
  originRegion?: string;
  /** Destination region name for corridor lookup */
  destinationRegion?: string;
}

export class ZoneClassifier {
  /**
   * Classify the delivery zone for an origin–destination pair.
   *
   * Uses the same locality-inference logic as MapsRoutingBridge.inferRouteProfile()
   * to ensure consistent zone assignment across the system.
   */
  classify(origin: GeoPoint, destination: GeoPoint): ZoneClassificationResult {
    const originSummary = getLocalitySummary(origin);
    const destSummary = getLocalitySummary(destination);

    // Both points must resolve to at least a region name — otherwise delivery is unsupported
    if (!originSummary.regionName && !destSummary.regionName) {
      return {
        zone: null,
        unavailable: true,
        reason: 'Neither origin nor destination could be resolved to a known Tanzania location. Delivery is not available for this route.',
      };
    }

    // If one point is unresolvable, we can still service the route using the other point's region
    // as a cross-region delivery (most conservative/expensive zone)
    if (!originSummary.regionName || !destSummary.regionName) {
      return {
        zone: 'cross_region',
        unavailable: false,
        originRegion: originSummary.regionName ?? destSummary.regionName ?? undefined,
        destinationRegion: destSummary.regionName ?? originSummary.regionName ?? undefined,
      };
    }

    // Ward match (most specific)
    if (
      originSummary.wardName &&
      destSummary.wardName &&
      originSummary.wardName === destSummary.wardName
    ) {
      return { zone: 'same_ward', unavailable: false, originRegion: originSummary.regionName, destinationRegion: destSummary.regionName };
    }

    // District match
    if (
      originSummary.districtName &&
      destSummary.districtName &&
      originSummary.districtName === destSummary.districtName
    ) {
      return { zone: 'same_district', unavailable: false, originRegion: originSummary.regionName, destinationRegion: destSummary.regionName };
    }

    // Region match
    if (originSummary.regionName === destSummary.regionName) {
      return { zone: 'same_region', unavailable: false, originRegion: originSummary.regionName, destinationRegion: destSummary.regionName };
    }

    // Different regions
    return { zone: 'cross_region', unavailable: false, originRegion: originSummary.regionName, destinationRegion: destSummary.regionName };
  }
}
