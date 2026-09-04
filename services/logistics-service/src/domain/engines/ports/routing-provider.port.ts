/**
 * RoutingProvider Port
 *
 * Abstraction over road routing providers. Decouples the DeliveryPricingEngine
 * from any specific map provider (HERE Maps, Google Maps, local estimates, etc.).
 *
 * The concrete implementation chain is:
 *   RoutingCacheDecorator → MapsRoutingAdapter → MapsRoutingBridge + DistanceCalculationAlgorithm (fallback)
 */

import { GeoPoint } from '../../value-objects/geopoint.value-object';

export type RouteSource = 'live' | 'cache' | 'fallback';

export interface RoutingResult {
  /** Road distance in kilometres */
  distanceKm: number;
  /** Estimated delivery duration in minutes (includes typical traffic) */
  durationMinutes: number;
  /** Source of the routing result — used for observability and audit */
  source: RouteSource;
}

export interface RoutingProviderPort {
  /**
   * Get the road distance and estimated duration between two points.
   *
   * Must never return distanceKm = 0 for different points.
   * Must never throw — failures must be handled by falling back to geodesic estimates.
   */
  getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RoutingResult>;
}
