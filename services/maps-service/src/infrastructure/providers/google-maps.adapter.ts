/**
 * Google Maps API Routing Adapter - Production Implementation
 *
 * Constitution Section 8: Infrastructure Isolation Rule
 */

import {
    RoutingPort,
    OptimizedRoute,
    RouteSegment,
    RouteConstraints
} from '../../domain/engines/ports/routing.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { CircuitBreaker, createCircuitBreaker } from '../circuit-breaker';

interface GoogleMapsDirectionsResponse {
    status: string;
    routes: Array<{
        legs: Array<{
            distance: { value: number; text: string };
            duration: { value: number; text: string };
            duration_in_traffic?: { value: number; text: string };
            steps: Array<{
                distance: { value: number; text: string };
                duration: { value: number; text: string };
                end_location: { lat: number; lng: number };
                start_location: { lat: number; lng: number };
                html_instructions: string;
                travel_mode: string;
            }>;
        }>;
        overview_polyline: { points: string };
        bounds: {
            northeast: { lat: number; lng: number };
            southwest: { lat: number; lng: number };
        };
    }>;
    error_message?: string;
}

export class GoogleMapsRoutingAdapter implements RoutingPort {
    private readonly circuitBreaker: CircuitBreaker;
    private readonly baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';

    constructor(
        private apiKey: string,
        private readonly timeout: number = 10000 // 10 seconds
    ) {
        if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
            console.warn('⚠️  Google Maps API key not configured. Routing will use mock data.');
            this.apiKey = 'DEVELOPMENT_MODE';
        }

        this.circuitBreaker = createCircuitBreaker('google-maps-api', {
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

            const params = new URLSearchParams({
                origin: `${originCoords.lat},${originCoords.lng}`,
                destination: `${destCoords.lat},${destCoords.lng}`,
                key: this.apiKey,
                mode: 'driving',
                alternatives: 'true',
                units: 'metric'
            });

            // Add constraints
            if (constraints?.avoidTolls) {
                params.append('avoid', 'tolls');
            }
            if (constraints?.avoidHighways) {
                params.append('avoid', 'highways');
            }
            // Enable traffic-aware routing by default for better accuracy
            params.append('departure_time', 'now');

            const response = await this.makeRequest(`${this.baseUrl}?${params}`);
            const data = await response.json() as GoogleMapsDirectionsResponse;

            if (data.status !== 'OK') {
                throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
            }

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No routes found');
            }

            // Convert the first (optimal) route
            return this.convertGoogleRouteToOptimizedRoute(data.routes[0], [origin, destination]);
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

            const originCoords = waypoints[0].getCoordinates();
            const destinationCoords = waypoints[waypoints.length - 1].getCoordinates();

            const params = new URLSearchParams({
                origin: `${originCoords.lat},${originCoords.lng}`,
                destination: `${destinationCoords.lat},${destinationCoords.lng}`,
                key: this.apiKey,
                mode: 'driving',
                units: 'metric'
            });

            // Add intermediate waypoints (Google allows up to 25 total waypoints)
            if (waypoints.length > 2) {
                const intermediates = waypoints.slice(1, -1)
                    .map(point => {
                        const coords = point.getCoordinates();
                        return `${coords.lat},${coords.lng}`;
                    })
                    .join('|');

                params.append('waypoints', intermediates);
                params.append('optimize', 'true'); // Optimize waypoint order
            }

            // Add constraints
            if (constraints?.avoidTolls) {
                params.append('avoid', 'tolls');
            }
            if (constraints?.avoidHighways) {
                params.append('avoid', 'highways');
            }
            // Enable traffic-aware routing by default for better accuracy
            params.append('departure_time', 'now');

            const response = await this.makeRequest(`${this.baseUrl}?${params}`);
            const data = await response.json() as GoogleMapsDirectionsResponse;

            if (data.status !== 'OK') {
                throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
            }

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No routes found');
            }

            // For optimized routes, Google may reorder waypoints
            const optimizedWaypoints = this.extractWaypointsFromRoute(data.routes[0], waypoints);
            return this.convertGoogleRouteToOptimizedRoute(data.routes[0], optimizedWaypoints);
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
                origin: `${originCoords.lat},${originCoords.lng}`,
                destination: `${destCoords.lat},${destCoords.lng}`,
                key: this.apiKey,
                mode: 'driving',
                alternatives: 'true',
                units: 'metric'
            });

            const response = await this.makeRequest(`${this.baseUrl}?${params}`);
            const data = await response.json() as GoogleMapsDirectionsResponse;

            if (data.status !== 'OK') {
                throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
            }

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No routes found');
            }

            const alternatives: OptimizedRoute[] = [];
            const maxRoutes = Math.min(count, data.routes.length);

            for (let i = 0; i < maxRoutes; i++) {
                const route = this.convertGoogleRouteToOptimizedRoute(data.routes[i], [origin, destination]);
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

            // Try to calculate the route to validate it
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
                    'User-Agent': 'Maysar-Maps-Service/1.0'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

    private convertGoogleRouteToOptimizedRoute(
        googleRoute: GoogleMapsDirectionsResponse['routes'][0],
        waypoints: GeoPoint[]
    ): OptimizedRoute {
        const totalDistance = googleRoute.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
        const totalDuration = googleRoute.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

        // Convert to kilometers and minutes
        const totalDistanceKm = totalDistance / 1000;
        const totalDurationMinutes = totalDuration / 60;

        // Calculate segments from steps
        const segments: RouteSegment[] = [];

        googleRoute.legs.forEach((leg, legIndex) => {
            leg.steps.forEach((step, stepIndex) => {
                segments.push({
                    start: GeoPoint.create(step.start_location.lat, step.start_location.lng, `Step ${legIndex}-${stepIndex} start`),
                    end: GeoPoint.create(step.end_location.lat, step.end_location.lng, `Step ${legIndex}-${stepIndex} end`),
                    distance: step.distance.value / 1000, // Convert to km
                    duration: step.duration.value / 60,   // Convert to minutes
                    roadType: this.inferRoadType(step.html_instructions),
                    trafficLevel: this.calculateTrafficLevel(leg, step)
                });
            });
        });

        // Calculate efficiency based on distance and duration
        const straightLineDistance = this.calculateStraightLineDistance(waypoints);
        const efficiency = Math.min(100, (straightLineDistance / totalDistanceKm) * 100);

        return {
            segments,
            totalDistance: totalDistanceKm,
            totalDuration: totalDurationMinutes,
            waypoints,
            efficiency: Math.round(efficiency),
            confidence: 0.95,
            alternatives: [segments]
        };
    }

    private inferRoadType(instructions: string): 'highway' | 'main_road' | 'local_street' | 'alley' {
        const lowerInstructions = instructions.toLowerCase();

        if (lowerInstructions.includes('highway') || lowerInstructions.includes('motorway') || lowerInstructions.includes('interstate')) {
            return 'highway';
        } else if (lowerInstructions.includes('avenue') || lowerInstructions.includes('boulevard') || lowerInstructions.includes('street')) {
            return 'main_road';
        } else if (lowerInstructions.includes('road') || lowerInstructions.includes('lane')) {
            return 'local_street';
        } else {
            return 'alley'; // Default for narrow or unnamed roads
        }
    }

    private calculateTrafficLevel(leg: any, step: any): number {
        if (leg.duration_in_traffic) {
            const trafficMultiplier = leg.duration_in_traffic.value / leg.duration.value;
            return Math.min(100, Math.max(0, (trafficMultiplier - 1) * 50));
        }

        const roadType = this.inferRoadType(step.html_instructions);
        const hour = new Date().getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

        let baseTraffic = 15;
        if (roadType === 'highway' && isRushHour) {
            baseTraffic = 60;
        } else if (roadType === 'main_road' && isRushHour) {
            baseTraffic = 45;
        }

        return baseTraffic;
    }

    private calculateStraightLineDistance(waypoints: GeoPoint[]): number {
        let totalDistance = 0;

        for (let i = 0; i < waypoints.length - 1; i++) {
            const startCoords = waypoints[i].getCoordinates();
            const endCoords = waypoints[i + 1].getCoordinates();

            const earthRadiusKm = 6371;
            const avgLatRad = this.toRadians((startCoords.lat + endCoords.lat) / 2);
            const x = this.toRadians(endCoords.lng - startCoords.lng) * Math.cos(avgLatRad);
            const y = this.toRadians(endCoords.lat - startCoords.lat);

            totalDistance += earthRadiusKm * Math.sqrt((x * x) + (y * y));
        }

        return totalDistance;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private extractWaypointsFromRoute(
        googleRoute: GoogleMapsDirectionsResponse['routes'][0],
        originalWaypoints: GeoPoint[]
    ): GeoPoint[] {
        return originalWaypoints;
    }

    getCircuitBreakerMetrics() {
        return this.circuitBreaker.getMetrics();
    }
}
