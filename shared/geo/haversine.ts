/**
 * Shared Haversine utility — works with raw lat/lng numbers.
 * No external dependencies. Used across catalog, logistics, and checkout services.
 */

const EARTH_RADIUS_KM = 6371.0;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Returns great-circle distance in km between two WGS-84 points.
 * Pure function — symmetric, identity at zero.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
