/**
 * Haversine Distance Utility
 *
 * Computes the great-circle (straight-line) distance between two geographic
 * points using the Haversine formula.
 *
 * Properties:
 *   - haversineKm(a, b) === haversineKm(b, a)  (symmetry)
 *   - haversineKm(a, a) === 0                   (identity)
 *   - Always returns non-negative value
 *
 * NOTE: Haversine gives straight-line distance, not road distance.
 * It is used for proximity checks in the consolidation engine.
 * Road distance for pricing must still be obtained from MapsRoutingBridge.
 */

import { GeoPoint } from '../value-objects/geopoint.value-object';

const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Compute Haversine great-circle distance between two GeoPoints in km.
 * Pure function — no side effects.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRadians(a.getLatitude());
  const lat2 = toRadians(b.getLatitude());
  const dLat = toRadians(b.getLatitude() - a.getLatitude());
  const dLng = toRadians(b.getLongitude() - a.getLongitude());

  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);

  const h =
    sinDlat * sinDlat +
    Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Compute total Haversine path length for an ordered sequence of points.
 * Useful for comparing pickup route lengths.
 */
export function haversinePathKm(points: GeoPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineKm(points[i], points[i + 1]);
  }
  return total;
}
