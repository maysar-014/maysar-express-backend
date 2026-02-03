/**
 * HERE Technologies Route Optimization Adapter - Production Implementation
 *
 * Constitution Section 8: Infrastructure Isolation Rule
 * Provides real external API integration with circuit breaker protection
 */

import { RouteOptimizationPort, OptimizedRoute, RouteSegment, RouteConstraints } from '../../domain/engines/ports/route-optimization.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { CircuitBreaker, createCircuitBreaker } from '../circuit-breaker';

interface HereRoutingV8Response {
  routes: Array<{
    id: string;
    sections: Array<{
      id: string;
      type: string;
      departure: {
        time: string;
        place: {
          type: string;
          location: { lat: number; lng: number };
          originalLocation: { lat: number; lng: number };
        };
      };
      arrival: {
        time: string;
        place: {
          type: string;
          location: { lat: number; lng: number };
          originalLocation: { lat: number; lng: number };
        };
      };
      summary: {
        duration: number; // seconds with traffic
        length: number;   // meters
        baseDuration: number; // seconds without traffic
      };
      transport: {
        mode: string;
      };
      polyline: string; // Encoded polyline
    }>;
  }>;
}

export class HereRouteAdapter implements RouteOptimizationPort {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly baseUrl = 'https://router.hereapi.com/v8/routes';

  constructor(
    private apiKey: string,
    private readonly timeout: number = 10000 // 10 seconds
  ) {
    if (!apiKey || apiKey === 'your_here_api_key_here') {
      console.error('❌ HERE API key not configured! Please set HERE_API_KEY in your .env file.');
      console.error('🔗 Get your API key from: https://developer.here.com/');
      throw new Error('HERE API key is required for route optimization');
    }

    console.log('✅ HERE Route Adapter initialized with API key:', apiKey.substring(0, 8) + '...');

    this.circuitBreaker = createCircuitBreaker('here-maps-api', {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      successThreshold: 2
    });
  }

  async calculateOptimalRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    constraints?: RouteConstraints
  ): Promise<OptimizedRoute> {
    return this.circuitBreaker.execute(async () => {
      const originCoords = origin.getCoordinates();
      const destCoords = destination.getCoordinates();

      // Map vehicle types to HERE transport modes
      const transportMode = this.mapVehicleTypeToTransportMode(constraints?.vehicleType);

      const params = new URLSearchParams({
        apiKey: this.apiKey,
        origin: `${originCoords.lat},${originCoords.lng}`,
        destination: `${destCoords.lat},${destCoords.lng}`,
        transportMode,
        routingMode: 'fast',
        return: 'summary,polyline',
        departureTime: 'now' // Enable traffic awareness
      });

      if (constraints?.avoidTolls) {
        params.append('avoid[features]', 'tollRoad');
      }
      if (constraints?.avoidHighways) {
        params.append('avoid[features]', 'motorway');
      }

      // Add vehicle-specific constraints
      this.addVehicleConstraints(params, constraints?.vehicleType);

      const response = await this.makeRequest(`${this.baseUrl}?${params}`);
      const data = await response.json() as HereRoutingV8Response;

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found from HERE API');
      }

      return this.convertHereRouteToOptimizedRoute(data.routes[0], [origin, destination]);
    });
  }

  async calculateMultiStopRoute(
    waypoints: GeoPoint[],
    constraints?: RouteConstraints
  ): Promise<OptimizedRoute> {
    return this.circuitBreaker.execute(async () => {
      if (waypoints.length < 2) {
        throw new Error('At least 2 waypoints required');
      }

      if (waypoints.length > 30) {
        throw new Error('HERE API supports maximum 30 waypoints');
      }

      const originCoords = waypoints[0].getCoordinates();
      const destCoords = waypoints[waypoints.length - 1].getCoordinates();

      const params = new URLSearchParams({
        apiKey: this.apiKey,
        origin: `${originCoords.lat},${originCoords.lng}`,
        destination: `${destCoords.lat},${destCoords.lng}`,
        transportMode: 'car',
        routingMode: 'fast',
        return: 'summary,polyline'
      });

      if (waypoints.length > 2) {
        const intermediates = waypoints.slice(1, -1)
          .map(point => {
            const coords = point.getCoordinates();
            return `${coords.lat},${coords.lng}`;
          });

        params.append('via', intermediates.join('|'));
      }

      if (constraints?.avoidTolls) {
        params.append('avoid[features]', 'tollRoad');
      }
      if (constraints?.avoidHighways) {
        params.append('avoid[features]', 'motorway');
      }

      const response = await this.makeRequest(`${this.baseUrl}?${params}`);
      const data = await response.json() as HereRoutingV8Response;

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found from HERE API');
      }

      return this.convertHereRouteToOptimizedRoute(data.routes[0], waypoints);
    });
  }

  async getRouteAlternatives(
    origin: GeoPoint,
    destination: GeoPoint,
    count: number = 3
  ): Promise<OptimizedRoute[]> {
    return this.circuitBreaker.execute(async () => {
      const originCoords = origin.getCoordinates();
      const destCoords = destination.getCoordinates();

      const params = new URLSearchParams({
        apiKey: this.apiKey,
        origin: `${originCoords.lat},${originCoords.lng}`,
        destination: `${destCoords.lat},${destCoords.lng}`,
        transportMode: 'car',
        alternatives: Math.min(count, 6).toString(),
        routingMode: 'fast',
        return: 'summary,polyline'
      });

      const response = await this.makeRequest(`${this.baseUrl}?${params}`);
      const data = await response.json() as HereRoutingV8Response;

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found from HERE API');
      }

      const alternatives: OptimizedRoute[] = [];
      const maxRoutes = Math.min(count, data.routes.length);

      for (let i = 0; i < maxRoutes; i++) {
        const route = this.convertHereRouteToOptimizedRoute(data.routes[i], [origin, destination]);
        alternatives.push(route);
      }

      return alternatives;
    });
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

      if (route.length > 30) {
        return {
          isValid: false,
          issues: ['HERE API supports maximum 30 waypoints']
        };
      }

      const optimized = await this.calculateMultiStopRoute(route);

      return {
        isValid: true,
        issues: [],
        optimizedVersion: optimized
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Route validation failed: ${(error as Error).message}`]
      };
    }
  }

  private async makeRequest(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Maysar-Logistics-Service/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HERE API error: ${response.status} - ${errorText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  private convertHereRouteToOptimizedRoute(
    hereRoute: HereRoutingV8Response['routes'][0],
    waypoints: GeoPoint[]
  ): OptimizedRoute {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalBaseDuration = 0;

    hereRoute.sections.forEach(section => {
      totalDistance += section.summary.length;
      totalDuration += section.summary.duration;
      totalBaseDuration += section.summary.baseDuration;
    });

    const totalDistanceKm = totalDistance / 1000;
    const totalDurationMinutes = totalDuration / 60;
    const totalBaseDurationMinutes = totalBaseDuration / 60;
    const trafficDelayMinutes = totalDurationMinutes - totalBaseDurationMinutes;

    const segments: RouteSegment[] = [];

    hereRoute.sections.forEach((section, sectionIndex) => {
      const startPoint = GeoPoint.create(
        section.departure.place.location.lat,
        section.departure.place.location.lng,
        `Section ${sectionIndex} start`
      );

      const endPoint = GeoPoint.create(
        section.arrival.place.location.lat,
        section.arrival.place.location.lng,
        `Section ${sectionIndex} end`
      );

      segments.push({
        start: startPoint,
        end: endPoint,
        distance: section.summary.length / 1000,
        duration: section.summary.duration / 60,
        roadType: 'main_road',
        trafficLevel: 20
      });
    });

    const straightLineDistance = this.calculateStraightLineDistance(waypoints);
    const efficiency = Math.min(100, (straightLineDistance / totalDistanceKm) * 100);

    return {
      segments,
      totalDistance: totalDistanceKm,
      totalDuration: totalDurationMinutes,
      baseDuration: totalBaseDurationMinutes,
      trafficDelay: Math.max(0, trafficDelayMinutes), // Ensure non-negative
      waypoints,
      efficiency: Math.round(efficiency),
      confidence: 0.90,
      alternatives: [segments]
    };
  }

  private calculateStraightLineDistance(waypoints: GeoPoint[]): number {
    let totalDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const startCoords = waypoints[i].getCoordinates();
      const endCoords = waypoints[i + 1].getCoordinates();

      const R = 6371;
      const dLat = this.toRadians(endCoords.lat - startCoords.lat);
      const dLon = this.toRadians(endCoords.lng - startCoords.lng);

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(startCoords.lat)) * Math.cos(this.toRadians(endCoords.lat)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }

    return totalDistance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Map courier vehicle types to HERE transport modes
   */
  private mapVehicleTypeToTransportMode(vehicleType?: string): string {
    if (!vehicleType) return 'car';

    const vehicleMapping: Record<string, string> = {
      'bike': 'motorcycle',
      'motorcycle': 'motorcycle',
      'bicycle': 'bicycle',
      'car': 'car',
      'van': 'truck',
      'truck': 'truck',
      'scooter': 'motorcycle'
    };

    return vehicleMapping[vehicleType.toLowerCase()] || 'car';
  }

  /**
   * Add vehicle-specific constraints to URL parameters
   */
  private addVehicleConstraints(params: URLSearchParams, vehicleType?: string): void {
    if (!vehicleType) return;

    const vehicleTypeLower = vehicleType.toLowerCase();

    // Add truck-specific constraints
    if (vehicleTypeLower === 'truck' || vehicleTypeLower === 'van') {
      params.append('truck[weight]', '1200'); // 1.2 tons
      params.append('truck[height]', '3.2');  // 3.2 meters
    }

    // Add motorcycle/bicycle constraints
    if (vehicleTypeLower === 'motorcycle' || vehicleTypeLower === 'bicycle' || vehicleTypeLower === 'bike') {
      params.append('avoid[features]', 'ferry'); // Motorcycles/bicycles typically avoid ferries
    }
  }

  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }
}
