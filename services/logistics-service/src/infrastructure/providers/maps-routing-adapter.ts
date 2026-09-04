/**
 * MapsRoutingAdapter
 *
 * Implements RoutingProviderPort by delegating to MapsRoutingBridge for
 * real routing calculations and falling back to DistanceCalculationAlgorithm
 * when the bridge is unavailable or times out.
 */

import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { RoutingProviderPort, RoutingResult } from '../../domain/engines/ports/routing-provider.port';
import { MapsRoutingBridge } from './maps-routing.bridge';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';

export class MapsRoutingAdapter implements RoutingProviderPort {
  private readonly bridge: MapsRoutingBridge;

  constructor(bridge?: MapsRoutingBridge) {
    this.bridge = bridge ?? new MapsRoutingBridge();
  }

  async getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RoutingResult> {
    try {
      const route = await this.bridge.calculateOptimalRoute(origin, destination);

      // Guard against zero distance for distinct points
      const distanceKm = route.totalDistance > 0
        ? route.totalDistance
        : this.geodesicFallback(origin, destination);

      const durationMinutes = route.totalDuration > 0
        ? route.totalDuration
        : Math.max(1, Math.round((distanceKm / 30) * 60)); // ~30 km/h average

      return { distanceKm, durationMinutes, source: 'live' };
    } catch {
      return this.buildFallback(origin, destination);
    }
  }

  private buildFallback(origin: GeoPoint, destination: GeoPoint): RoutingResult {
    const distanceKm = this.geodesicFallback(origin, destination);
    const durationMinutes = Math.max(1, Math.round((distanceKm / 28) * 60)); // ~28 km/h conservative estimate

    return { distanceKm, durationMinutes, source: 'fallback' };
  }

  private geodesicFallback(origin: GeoPoint, destination: GeoPoint): number {
    const straight = origin.distanceTo(destination);
    // Apply default inflation factor (same as DistanceCalculationAlgorithm default = 1.35)
    return Math.round(straight * DistanceCalculationAlgorithm.getFallbackConfigSnapshot().inflationFactor * 100) / 100;
  }
}
