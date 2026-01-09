 import {
  RouteOptimizationPort,
  OptimizedRoute,
  RouteSegment,
  RouteConstraints
} from '../../domain/engines/ports/route-optimization.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class RouteOptimizationAdapter implements RouteOptimizationPort {
  constructor(private apiKey?: string) {}

  async calculateOptimalRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    constraints?: RouteConstraints
  ): Promise<OptimizedRoute> {
    try {
      const alternatives = await this.getRouteAlternatives(origin, destination, 3);
      return alternatives[0]; // Return the best (first) alternative
    } catch (error) {
      console.error('Error calculating optimal route:', error);
      return this.createFallbackRoute(origin, destination);
    }
  }

  async calculateMultiStopRoute(
    waypoints: GeoPoint[],
    constraints?: RouteConstraints
  ): Promise<OptimizedRoute> {
    try {
      if (waypoints.length < 2) {
        throw new Error('At least 2 waypoints required');
      }

      // For multi-stop routes, optimize the sequence and calculate segments
      const optimizedWaypoints = this.optimizeWaypointOrder(waypoints);
      const segments = this.calculateRouteSegments(optimizedWaypoints);

      return {
        segments,
        totalDistance: segments.reduce((sum, seg) => sum + seg.distance, 0),
        totalDuration: segments.reduce((sum, seg) => sum + seg.duration, 0),
        waypoints: optimizedWaypoints,
        efficiency: 85,
        confidence: 0.8,
        alternatives: [segments] // Simplified
      };
    } catch (error) {
      console.error('Error calculating multi-stop route:', error);
      return this.createFallbackMultiRoute(waypoints);
    }
  }

  async getRouteAlternatives(
    origin: GeoPoint,
    destination: GeoPoint,
    count: number
  ): Promise<OptimizedRoute[]> {
    try {
      const alternatives: OptimizedRoute[] = [];

      for (let i = 0; i < count; i++) {
        const route = await this.generateRouteAlternative(origin, destination, i);
        alternatives.push(route);
      }

      return alternatives.sort((a, b) => a.totalDuration - b.totalDuration);
    } catch (error) {
      console.error('Error getting route alternatives:', error);
      return [this.createFallbackRoute(origin, destination)];
    }
  }

  async validateRoute(route: GeoPoint[]): Promise<{
    isValid: boolean;
    issues: string[];
    optimizedVersion?: OptimizedRoute;
  }> {
    try {
      if (route.length < 2) {
        return {
          isValid: false,
          issues: ['Route must have at least 2 points']
        };
      }

      // Check for invalid coordinates
      const invalidPoints = route.filter(point => {
        const coords = point.getCoordinates();
        return coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180;
      });

      if (invalidPoints.length > 0) {
        return {
          isValid: false,
          issues: ['Invalid coordinates in route']
        };
      }

      // Calculate optimized version
      const optimized = await this.calculateMultiStopRoute(route);

      return {
        isValid: true,
        issues: [],
        optimizedVersion: optimized
      };
    } catch (error) {
      return {
        isValid: false,
        issues: ['Route validation failed']
      };
    }
  }

  private async generateRouteAlternative(
    origin: GeoPoint,
    destination: GeoPoint,
    routeIndex: number
  ): Promise<OptimizedRoute> {
    const originCoords = origin.getCoordinates();
    const destCoords = destination.getCoordinates();

    // Calculate base distance
    const baseDistance = Math.sqrt(
      Math.pow(destCoords.lat - originCoords.lat, 2) +
      Math.pow(destCoords.lng - originCoords.lng, 2)
    ) * 111; // Rough km conversion

    // Route variations
    const routeTypes = [
      { name: 'fastest', multiplier: 1.0, segments: 2, efficiency: 90 },
      { name: 'balanced', multiplier: 1.05, segments: 3, efficiency: 85 },
      { name: 'scenic', multiplier: 1.15, segments: 4, efficiency: 75 }
    ];

    const routeType = routeTypes[routeIndex % routeTypes.length];
    const totalDistance = baseDistance * routeType.multiplier;
    const totalDuration = totalDistance / 35 * 60; // 35 km/h average

    const segments = this.generateRouteSegments(
      origin,
      destination,
      routeType.segments,
      totalDistance,
      totalDuration,
      routeType.name
    );

    return {
      segments,
      totalDistance,
      totalDuration,
      waypoints: [origin, destination],
      efficiency: routeType.efficiency,
      confidence: 0.9 - (routeIndex * 0.1), // Decreasing confidence for alternatives
      alternatives: [segments]
    };
  }

  private generateRouteSegments(
    origin: GeoPoint,
    destination: GeoPoint,
    segmentCount: number,
    totalDistance: number,
    totalDuration: number,
    routeType: string
  ): RouteSegment[] {
    const segments: RouteSegment[] = [];
    const originCoords = origin.getCoordinates();
    const destCoords = destination.getCoordinates();

    for (let i = 0; i < segmentCount; i++) {
      const startRatio = i / segmentCount;
      const endRatio = (i + 1) / segmentCount;

      const startLat = originCoords.lat + (destCoords.lat - originCoords.lat) * startRatio;
      const startLng = originCoords.lng + (destCoords.lng - originCoords.lng) * startRatio;
      const endLat = originCoords.lat + (destCoords.lat - originCoords.lat) * endRatio;
      const endLng = originCoords.lng + (destCoords.lng - originCoords.lng) * endRatio;

      const segmentDistance = totalDistance / segmentCount;
      const segmentDuration = totalDuration / segmentCount;

      // Determine road type based on route type and position
      let roadType: 'highway' | 'main_road' | 'local_street' | 'alley' = 'main_road';
      if (routeType === 'fastest' && i === 0) roadType = 'highway';
      else if (routeType === 'scenic') roadType = 'local_street';

      segments.push({
        start: GeoPoint.create(startLat, startLng, `Segment ${i} start`),
        end: GeoPoint.create(endLat, endLng, `Segment ${i} end`),
        distance: segmentDistance,
        duration: segmentDuration,
        roadType,
        trafficLevel: Math.floor(Math.random() * 30) + 10 // 10-40% traffic
      });
    }

    return segments;
  }

  private calculateRouteSegments(waypoints: GeoPoint[]): RouteSegment[] {
    const segments: RouteSegment[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      const startCoords = start.getCoordinates();
      const endCoords = end.getCoordinates();

      const distance = Math.sqrt(
        Math.pow(endCoords.lat - startCoords.lat, 2) +
        Math.pow(endCoords.lng - startCoords.lng, 2)
      ) * 111;

      const duration = distance / 35 * 60; // 35 km/h

      segments.push({
        start,
        end,
        distance,
        duration,
        roadType: 'main_road',
        trafficLevel: 15
      });
    }

    return segments;
  }

  private optimizeWaypointOrder(waypoints: GeoPoint[]): GeoPoint[] {
    // Simple nearest neighbor optimization (can be improved with TSP algorithms)
    if (waypoints.length <= 2) return waypoints;

    const optimized = [waypoints[0]]; // Start with first point
    const remaining = waypoints.slice(1);

    while (remaining.length > 0) {
      const last = optimized[optimized.length - 1];
      let nearestIndex = 0;
      let nearestDistance = last.distanceTo(remaining[0]);

      for (let i = 1; i < remaining.length; i++) {
        const distance = last.distanceTo(remaining[i]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      optimized.push(remaining[nearestIndex]);
      remaining.splice(nearestIndex, 1);
    }

    return optimized;
  }

  private createFallbackRoute(origin: GeoPoint, destination: GeoPoint): OptimizedRoute {
    const distance = 10;
    const duration = 15;

    return {
      segments: [{
        start: origin,
        end: destination,
        distance,
        duration,
        roadType: 'main_road',
        trafficLevel: 10
      }],
      totalDistance: distance,
      totalDuration: duration,
      waypoints: [origin, destination],
      efficiency: 50,
      confidence: 0.5,
      alternatives: []
    };
  }

  private createFallbackMultiRoute(waypoints: GeoPoint[]): OptimizedRoute {
    const segments = this.calculateRouteSegments(waypoints);

    return {
      segments,
      totalDistance: segments.reduce((sum, seg) => sum + seg.distance, 0),
      totalDuration: segments.reduce((sum, seg) => sum + seg.duration, 0),
      waypoints,
      efficiency: 50,
      confidence: 0.5,
      alternatives: [segments]
    };
  }
}
