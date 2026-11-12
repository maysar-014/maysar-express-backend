/**
 * Haversine Routing Adapter — Offline Fallback
 *
 * Used when no external routing provider (e.g. Google Maps) is configured.
 * Computes straight-line (great-circle) distances using the Haversine formula
 * and estimates driving duration assuming an average speed of 30 km/h in
 * city conditions — matching the same fallback used by the logistics service's
 * ConsolidationOrchestrator.
 *
 * This is intentionally simple: it is a best-effort estimate for development
 * and lifecycle verification. Do not use in production without a real routing
 * provider.
 */

import { RoutingPort, OptimizedRoute, RouteSegment, RouteConstraints } from '../../domain/engines/ports/routing.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

const EARTH_RADIUS_KM = 6371;
const AVERAGE_SPEED_KMH = 30; // city driving average
const INFLATION_FACTOR = 1.35; // roads are longer than straight lines

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const ac = a.getCoordinates();
  const bc = b.getCoordinates();
  const dLat = toRadians(bc.lat - ac.lat);
  const dLng = toRadians(bc.lng - ac.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRadians(ac.lat)) * Math.cos(toRadians(bc.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function buildSegment(origin: GeoPoint, destination: GeoPoint): RouteSegment {
  const distKm = haversineKm(origin, destination) * INFLATION_FACTOR;
  const durationMin = (distKm / AVERAGE_SPEED_KMH) * 60;
  return {
    start: origin,
    end: destination,
    distance: distKm,
    duration: durationMin,
    roadType: 'main_road',
    trafficLevel: 20,
    instructions: 'Head towards destination',
  };
}

function buildRoute(waypoints: GeoPoint[]): OptimizedRoute {
  const segments: RouteSegment[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    segments.push(buildSegment(waypoints[i], waypoints[i + 1]));
  }
  const totalDistance = segments.reduce((s, seg) => s + seg.distance, 0);
  const totalDuration = segments.reduce((s, seg) => s + seg.duration, 0);
  return {
    segments,
    totalDistance,
    totalDuration,
    waypoints,
    efficiency: 85,
    confidence: 0.6, // lower confidence — this is a straight-line estimate
    alternatives: [segments],
  };
}

export class HaversineRoutingAdapter implements RoutingPort {
  async calculateOptimalRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    _constraints?: RouteConstraints
  ): Promise<OptimizedRoute> {
    return buildRoute([origin, destination]);
  }

  async calculateMultiStopRoute(
    waypoints: GeoPoint[],
    _constraints?: RouteConstraints
  ): Promise<OptimizedRoute> {
    if (waypoints.length < 2) {
      throw new Error('At least 2 waypoints required');
    }
    return buildRoute(waypoints);
  }

  async getRouteAlternatives(
    origin: GeoPoint,
    destination: GeoPoint,
    count: number = 1
  ): Promise<OptimizedRoute[]> {
    const route = buildRoute([origin, destination]);
    return Array.from({ length: Math.min(count, 3) }, () => route);
  }

  async validateRoute(route: GeoPoint[]): Promise<{
    isValid: boolean;
    issues: string[];
    optimizedVersion?: OptimizedRoute;
  }> {
    if (route.length < 2) {
      return { isValid: false, issues: ['Route must have at least 2 points'] };
    }
    return { isValid: true, issues: [], optimizedVersion: buildRoute(route) };
  }
}
