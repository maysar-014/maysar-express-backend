import { GeoPoint } from '../value-objects/geopoint.value-object';
import { RouteOptimizationPort, RouteConstraints } from '../engines/ports/route-optimization.port';

export interface DistanceResult {
  distance: number; // in kilometers
  bearing?: number; // in degrees (0-360)
  duration?: number; // estimated duration in minutes (optional)
}

export class DistanceCalculationAlgorithm {
  private static routeOptimizationService?: RouteOptimizationPort;

  /**
   * Set the route optimization service (HERE Technologies) for accurate road-based calculations
   */
  static setRouteOptimizationService(service: RouteOptimizationPort): void {
    this.routeOptimizationService = service;
  }
  /**
   * Calculate the great circle distance between two points using the Haversine formula
   * Returns distance in kilometers
   */
  static calculateHaversineDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371; // Earth's radius in km

    const lat1Rad = this.toRadians(point1.getLatitude());
    const lat2Rad = this.toRadians(point2.getLatitude());
    const deltaLatRad = this.toRadians(point2.getLatitude() - point1.getLatitude());
    const deltaLngRad = this.toRadians(point2.getLongitude() - point1.getLongitude());

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate the initial bearing from point1 to point2
   * Returns bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
   */
  static calculateBearing(point1: GeoPoint, point2: GeoPoint): number {
    const lat1Rad = this.toRadians(point1.getLatitude());
    const lat2Rad = this.toRadians(point2.getLatitude());
    const deltaLngRad = this.toRadians(point2.getLongitude() - point1.getLongitude());

    const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);

    const bearingRad = Math.atan2(y, x);
    const bearingDeg = this.toDegrees(bearingRad);

    // Normalize to 0-360 degrees
    return (bearingDeg + 360) % 360;
  }

  /**
   * Calculate distance, bearing, and estimated duration for delivery routing using HERE Technologies ONLY
   * Requires HERE service to be configured - no fallback to Haversine
   */
  static async calculateDeliveryDistance(
    origin: GeoPoint,
    destination: GeoPoint,
    averageSpeedKmh: number = 30,
    constraints?: RouteConstraints
  ): Promise<DistanceResult> {
    if (!this.routeOptimizationService) {
      throw new Error('HERE Technologies service is required for distance calculations. Configure HERE_API_KEY and call setRouteOptimizationService().');
    }

    const route = await this.routeOptimizationService.calculateOptimalRoute(origin, destination, constraints);
    const bearing = this.calculateBearing(origin, destination);

    return {
      distance: Math.round(route.totalDistance * 100) / 100, // Round to 2 decimal places
      bearing: Math.round(bearing * 100) / 100,
      duration: Math.round(route.totalDuration)
    };
  }

  /**
   * Check if a point is within a specified radius of another point
   */
  static isWithinRadius(center: GeoPoint, point: GeoPoint, radiusKm: number): boolean {
    return this.calculateHaversineDistance(center, point) <= radiusKm;
  }

  /**
   * Calculate the midpoint between two points
   */
  static calculateMidpoint(point1: GeoPoint, point2: GeoPoint): GeoPoint {
    const lat1Rad = this.toRadians(point1.getLatitude());
    const lat2Rad = this.toRadians(point2.getLatitude());
    const lng1Rad = this.toRadians(point1.getLongitude());
    const deltaLngRad = this.toRadians(point2.getLongitude() - point1.getLongitude());

    const bx = Math.cos(lat2Rad) * Math.cos(deltaLngRad);
    const by = Math.cos(lat2Rad) * Math.sin(deltaLngRad);

    const lat3Rad = Math.atan2(
      Math.sin(lat1Rad) + Math.sin(lat2Rad),
      Math.sqrt((Math.cos(lat1Rad) + bx) ** 2 + by ** 2)
    );

    const lng3Rad = lng1Rad + Math.atan2(by, Math.cos(lat1Rad) + bx);

    const lat3 = this.toDegrees(lat3Rad);
    const lng3 = this.toDegrees(lng3Rad);

    return GeoPoint.create(lat3, lng3, `Midpoint of ${point1.getAddress()} and ${point2.getAddress()}`);
  }

  /**
   * Calculate total distance for a route with multiple waypoints
   */
  static calculateRouteDistance(waypoints: GeoPoint[]): number {
    if (waypoints.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += this.calculateHaversineDistance(waypoints[i], waypoints[i + 1]);
    }

    return Math.round(totalDistance * 100) / 100;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}
