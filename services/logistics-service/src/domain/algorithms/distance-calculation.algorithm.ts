import { GeoPoint } from '../value-objects/geopoint.value-object';
import { RouteOptimizationPort, RouteConstraints } from '../engines/ports/route-optimization.port';

export interface DistanceResult {
  distance: number; // in kilometers
  bearing?: number; // in degrees (0-360)
  duration?: number; // estimated duration in minutes with traffic
  baseDuration?: number; // estimated duration without traffic
  trafficDelay?: number; // traffic delay in minutes
}

export interface DistanceFallbackConfig {
  enabled: boolean;
  inflationFactor: number;
  timeoutMs: number;
}

export class DistanceCalculationAlgorithm {
  private static routeOptimizationService?: RouteOptimizationPort;
  private static readonly DEFAULT_INFLATION_FACTOR = 1.35;
  private static readonly DEFAULT_ROUTING_TIMEOUT_MS = 800;
  private static fallbackConfig: DistanceFallbackConfig = {
    enabled: true,
    inflationFactor: DistanceCalculationAlgorithm.DEFAULT_INFLATION_FACTOR,
    timeoutMs: DistanceCalculationAlgorithm.DEFAULT_ROUTING_TIMEOUT_MS
  };

  /**
   * Set the route optimization service used for road-based calculations.
   */
  static setRouteOptimizationService(service: RouteOptimizationPort): void {
    this.routeOptimizationService = service;
  }

  /**
   * Configure fallback behavior (infrastructure layer should supply environment-based config).
   */
  static configureFallback(config: Partial<DistanceFallbackConfig>): void {
    this.fallbackConfig = this.normalizeFallbackConfig({
      ...this.fallbackConfig,
      ...config
    });
  }

  static getFallbackConfigSnapshot(): DistanceFallbackConfig {
    return { ...this.fallbackConfig };
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
   * Calculate distance, bearing, and estimated duration for delivery routing.
   * Uses the configured route optimization service when available and a local
   * geodesic fallback otherwise.
   */
  static async calculateDeliveryDistance(
    origin: GeoPoint,
    destination: GeoPoint,
    averageSpeedKmh: number = 30,
    constraints?: RouteConstraints
  ): Promise<DistanceResult> {
    const { enabled: fallbackEnabled, inflationFactor, timeoutMs } = this.getFallbackConfig();
    const bearing = this.calculateBearing(origin, destination);

    if (!this.routeOptimizationService) {
      if (!fallbackEnabled) {
        throw new Error('Route optimization service is required for distance calculations. Configure a routing provider or enable fallback.');
      }
      return this.buildFallbackResult(origin, destination, averageSpeedKmh, bearing, inflationFactor);
    }

    try {
      const route = await this.withTimeout(
        this.routeOptimizationService.calculateOptimalRoute(origin, destination, constraints),
        timeoutMs
      );

      return {
        distance: Math.round(route.totalDistance * 100) / 100, // Round to 2 decimal places
        bearing: Math.round(bearing * 100) / 100,
        duration: Math.round(route.totalDuration),
        baseDuration: route.baseDuration ? Math.round(route.baseDuration) : undefined,
        trafficDelay: route.trafficDelay !== undefined ? Math.round(route.trafficDelay * 100) / 100 : undefined
      };
    } catch (error) {
      if (!fallbackEnabled) {
        throw error;
      }
      return this.buildFallbackResult(origin, destination, averageSpeedKmh, bearing, inflationFactor);
    }
  }

  /**
   * Check if a point is within a specified radius of another point using the configured routing path.
   */
  static async isWithinRadius(center: GeoPoint, point: GeoPoint, radiusKm: number): Promise<boolean> {
    const { enabled: fallbackEnabled } = this.getFallbackConfig();
    if (!this.routeOptimizationService && !fallbackEnabled) {
      throw new Error('Route optimization service is required for distance calculations. Configure a routing provider or enable fallback.');
    }

    const distanceResult = await this.calculateDeliveryDistance(center, point);
    return distanceResult.distance <= radiusKm;
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
   * Calculate total distance for a route with multiple waypoints using the configured routing path.
   */
  static async calculateRouteDistance(waypoints: GeoPoint[]): Promise<number> {
    if (waypoints.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segmentResult = await this.calculateDeliveryDistance(waypoints[i], waypoints[i + 1]);
      totalDistance += segmentResult.distance;
    }

    return Math.round(totalDistance * 100) / 100;
  }

  private static buildFallbackResult(
    origin: GeoPoint,
    destination: GeoPoint,
    averageSpeedKmh: number,
    bearing: number,
    inflationFactor: number
  ): DistanceResult {
    const straightDistance = origin.distanceTo(destination);
    const inflatedDistance = straightDistance * inflationFactor;
    const durationMinutes = (inflatedDistance / averageSpeedKmh) * 60;

    return {
      distance: Math.round(inflatedDistance * 100) / 100,
      bearing: Math.round(bearing * 100) / 100,
      duration: Math.round(durationMinutes),
      baseDuration: Math.round(durationMinutes),
      trafficDelay: 0
    };
  }

  private static getFallbackConfig(): DistanceFallbackConfig {
    return this.fallbackConfig;
  }

  private static normalizeFallbackConfig(config: DistanceFallbackConfig): DistanceFallbackConfig {
    const inflation = Number.isFinite(config.inflationFactor) && config.inflationFactor > 1
      ? config.inflationFactor
      : this.DEFAULT_INFLATION_FACTOR;
    const timeout = Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
      ? config.timeoutMs
      : this.DEFAULT_ROUTING_TIMEOUT_MS;
    return {
      enabled: Boolean(config.enabled),
      inflationFactor: inflation,
      timeoutMs: timeout
    };
  }

  private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return promise;
    }

    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Routing request timed out')), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}
