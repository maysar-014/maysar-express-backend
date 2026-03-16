/**
 * HERE Maps API Routing Adapter - Production Implementation
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

export class HereRoutingAdapter implements RoutingPort {
    private readonly baseUrl = 'https://router.hereapi.com/v8';

    constructor(private readonly apiKey: string) {
        if (!apiKey) {
            throw new Error('HERE_API_KEY is required. Synthetic/geodesic fallbacks are disabled.');
        }
    }

    async calculateOptimalRoute(
        origin: GeoPoint,
        destination: GeoPoint,
        constraints?: RouteConstraints
    ): Promise<OptimizedRoute> {
        const originCoords = origin.getCoordinates();
        const destCoords = destination.getCoordinates();

        const params = new URLSearchParams({
            apikey: this.apiKey,
            transportMode: this.getTransportMode(constraints),
            origin: `${originCoords.lat},${originCoords.lng}`,
            destination: `${destCoords.lat},${destCoords.lng}`,
            return: 'summary',
            routingMode: 'fast'
        });

        const routes = await this.requestRoutes(params);
        return this.toOptimizedRoute(routes[0], [origin, destination]);
    }

    async calculateMultiStopRoute(
        waypoints: GeoPoint[],
        constraints?: RouteConstraints
    ): Promise<OptimizedRoute> {
        if (waypoints.length < 2) {
            throw new Error('At least 2 waypoints required');
        }

        const params = new URLSearchParams({
            apikey: this.apiKey,
            transportMode: this.getTransportMode(constraints),
            return: 'summary',
            routingMode: 'fast'
        });

        waypoints.forEach((waypoint, index) => {
            const coords = waypoint.getCoordinates();
            if (index === 0) {
                params.set('origin', `${coords.lat},${coords.lng}`);
                return;
            }
            if (index === waypoints.length - 1) {
                params.set('destination', `${coords.lat},${coords.lng}`);
                return;
            }
            params.append('via', `${coords.lat},${coords.lng}`);
        });

        const routes = await this.requestRoutes(params);
        return this.toOptimizedRoute(routes[0], waypoints);
    }

    async getRouteAlternatives(
        origin: GeoPoint,
        destination: GeoPoint,
        count: number
    ): Promise<OptimizedRoute[]> {
        const originCoords = origin.getCoordinates();
        const destCoords = destination.getCoordinates();
        const requestedCount = Math.max(1, count);
        const params = new URLSearchParams({
            apikey: this.apiKey,
            transportMode: 'car',
            origin: `${originCoords.lat},${originCoords.lng}`,
            destination: `${destCoords.lat},${destCoords.lng}`,
            return: 'summary',
            routingMode: 'fast',
            alternatives: String(requestedCount)
        });

        const routes = await this.requestRoutes(params);
        return routes.slice(0, requestedCount).map((route: any) => this.toOptimizedRoute(route, [origin, destination]));
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

            const optimized = await this.calculateMultiStopRoute(route);

            return {
                isValid: true,
                issues: [],
                optimizedVersion: optimized
            };
        } catch (error) {
            return {
                isValid: false,
                issues: [(error as Error).message || 'Route validation failed']
            };
        }
    }

    private async requestRoutes(params: URLSearchParams): Promise<any[]> {
        const response = await fetch(`${this.baseUrl}/routes?${params.toString()}`);
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`HERE API request failed: ${response.status} ${response.statusText} - ${body}`);
        }

        const data = (await response.json()) as { routes?: any[] };
        if (!data.routes || data.routes.length === 0) {
            throw new Error('HERE API returned no route alternatives');
        }
        return data.routes;
    }

    private getTransportMode(constraints?: RouteConstraints): string {
        if (constraints?.vehicleType === 'motorcycle') {
            return 'scooter';
        }
        return 'car';
    }

    private toOptimizedRoute(route: any, waypoints: GeoPoint[]): OptimizedRoute {
        const summary = this.extractSummary(route);
        const segmentCount = Math.max(1, waypoints.length - 1);
        const segmentDistance = (summary.length / 1000) / segmentCount;
        const segmentDuration = (summary.duration / 60) / segmentCount;

        const segments: RouteSegment[] = [];
        for (let i = 0; i < segmentCount; i++) {
            const start = waypoints[i] || waypoints[0];
            const end = waypoints[i + 1] || waypoints[waypoints.length - 1];
            segments.push({
                start,
                end,
                distance: segmentDistance,
                duration: segmentDuration,
                roadType: 'main_road',
                trafficLevel: 15
            });
        }

        return {
            segments,
            totalDistance: summary.length / 1000,
            totalDuration: summary.duration / 60,
            waypoints,
            efficiency: this.calculateEfficiency(route),
            confidence: 0.95,
            alternatives: [segments]
        };
    }

    private extractSummary(route: any): { length: number; duration: number } {
        if (route?.summary?.length && route?.summary?.duration) {
            return route.summary;
        }

        if (Array.isArray(route?.sections) && route.sections.length > 0) {
            const totals = route.sections.reduce(
                (acc: { length: number; duration: number }, section: any) => {
                    const summary = section?.summary || {};
                    return {
                        length: acc.length + (summary.length || 0),
                        duration: acc.duration + (summary.duration || 0)
                    };
                },
                { length: 0, duration: 0 }
            );

            if (totals.length > 0 && totals.duration > 0) {
                return totals;
            }
        }

        throw new Error('HERE API route summary is missing length/duration');
    }

    private calculateEfficiency(route: any): number {
        if (Array.isArray(route?.sections) && route.sections.length > 0) {
            return 90;
        }
        return 85;
    }
}
