import { RouteOptimizationPort, OptimizedRoute, RouteConstraints, RouteSegment } from '../../domain/engines/ports/route-optimization.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { GeoPoint as MapsGeoPoint } from '../../../../maps-service/src/domain/value-objects/geopoint.value-object';
import { HereRoutingAdapter } from '../../../../maps-service/src/infrastructure/providers/here-maps.adapter';
import { RoutingPort } from '../../../../maps-service/src/domain/engines/ports/routing.port';

export class MapsRoutingBridge implements RouteOptimizationPort {
    private readonly provider: RoutingPort;

    constructor(provider?: RoutingPort) {
        this.provider = provider || new HereRoutingAdapter(this.getHereApiKey());
    }

    private getFallbackConfig(): { enabled: boolean; inflationFactor: number; timeoutMs: number; avgSpeedKmh: number } {
        const enabled = (process.env.ROUTING_FALLBACK_ENABLED ?? 'true') !== 'false';
        const inflationFactor = Number(process.env.ROUTING_FALLBACK_INFLATION_FACTOR ?? '1.35');
        const timeoutMs = Number(process.env.ROUTING_FALLBACK_TIMEOUT_MS ?? '800');
        const avgSpeedKmh = Number(process.env.ROUTING_FALLBACK_AVG_SPEED_KMH ?? '30');

        return {
            enabled,
            inflationFactor: Number.isFinite(inflationFactor) ? inflationFactor : 1.35,
            timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 800,
            avgSpeedKmh: Number.isFinite(avgSpeedKmh) ? avgSpeedKmh : 30
        };
    }

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        if (!timeoutMs || timeoutMs <= 0) {
            return promise;
        }

        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Routing timeout exceeded')), timeoutMs)
            )
        ]);
    }

    private buildFallbackRoute(
        waypoints: GeoPoint[],
        inflationFactor: number,
        avgSpeedKmh: number
    ): OptimizedRoute {
        if (waypoints.length < 2) {
            return {
                segments: [],
                totalDistance: 0,
                totalDuration: 0,
                waypoints,
                efficiency: 40,
                confidence: 0.4,
                alternatives: []
            };
        }

        const segments: RouteSegment[] = [];
        let totalDistance = 0;
        let totalDuration = 0;

        for (let i = 0; i < waypoints.length - 1; i++) {
            const start = waypoints[i];
            const end = waypoints[i + 1];
            const straightKm = start.distanceTo(end);
            const inflatedKm = straightKm * inflationFactor;
            const durationMinutes = Math.round((inflatedKm / avgSpeedKmh) * 60);

            totalDistance += inflatedKm;
            totalDuration += durationMinutes;

            segments.push({
                start,
                end,
                distance: Math.round(inflatedKm * 100) / 100,
                duration: durationMinutes,
                roadType: 'main_road',
                trafficLevel: 0
            });
        }

        return {
            segments,
            totalDistance: Math.round(totalDistance * 100) / 100,
            totalDuration,
            waypoints,
            efficiency: 45,
            confidence: 0.4,
            alternatives: []
        };
    }

    private getHereApiKey(): string {
        const apiKey = process.env.HERE_API_KEY;
        if (!apiKey) {
            throw new Error('HERE_API_KEY is required. Local geodesic fallbacks are disabled by architecture policy.');
        }
        return apiKey;
    }

    async calculateOptimalRoute(origin: GeoPoint, destination: GeoPoint, constraints?: RouteConstraints): Promise<OptimizedRoute> {
        const mapsOrigin = MapsGeoPoint.create(origin.getLatitude(), origin.getLongitude(), origin.getAddress());
        const mapsDest = MapsGeoPoint.create(destination.getLatitude(), destination.getLongitude(), destination.getAddress());

        // Constraints mapping if needed
        const fallback = this.getFallbackConfig();

        try {
            const result = await this.withTimeout(
                this.provider.calculateOptimalRoute(mapsOrigin, mapsDest, constraints as any),
                fallback.timeoutMs
            );
            return result as any;
        } catch (error) {
            if (!fallback.enabled) {
                throw error;
            }
            console.warn('[MapsRoutingBridge] Routing failed, using inflated haversine fallback.', error);
            return this.buildFallbackRoute([origin, destination], fallback.inflationFactor, fallback.avgSpeedKmh);
        }
    }

    async calculateMultiStopRoute(waypoints: GeoPoint[], constraints?: RouteConstraints): Promise<OptimizedRoute> {
        const mapsWaypoints = waypoints.map(wp => MapsGeoPoint.create(wp.getLatitude(), wp.getLongitude(), wp.getAddress()));
        const fallback = this.getFallbackConfig();

        try {
            const result = await this.withTimeout(
                this.provider.calculateMultiStopRoute(mapsWaypoints, constraints as any),
                fallback.timeoutMs
            );
            return result as any;
        } catch (error) {
            if (!fallback.enabled) {
                throw error;
            }
            console.warn('[MapsRoutingBridge] Multi-stop routing failed, using inflated haversine fallback.', error);
            return this.buildFallbackRoute(waypoints, fallback.inflationFactor, fallback.avgSpeedKmh);
        }
    }

    async getRouteAlternatives(origin: GeoPoint, destination: GeoPoint, count: number): Promise<OptimizedRoute[]> {
        const mapsOrigin = MapsGeoPoint.create(origin.getLatitude(), origin.getLongitude(), origin.getAddress());
        const mapsDest = MapsGeoPoint.create(destination.getLatitude(), destination.getLongitude(), destination.getAddress());
        const fallback = this.getFallbackConfig();

        try {
            const result = await this.withTimeout(
                this.provider.getRouteAlternatives(mapsOrigin, mapsDest, count),
                fallback.timeoutMs
            );
            return result as any;
        } catch (error) {
            if (!fallback.enabled) {
                throw error;
            }
            console.warn('[MapsRoutingBridge] Route alternatives failed, using inflated haversine fallback.', error);
            return [this.buildFallbackRoute([origin, destination], fallback.inflationFactor, fallback.avgSpeedKmh)];
        }
    }

    async validateRoute(route: GeoPoint[]): Promise<{ isValid: boolean; issues: string[]; optimizedVersion?: OptimizedRoute; }> {
        const mapsRoute = route.map(wp => MapsGeoPoint.create(wp.getLatitude(), wp.getLongitude(), wp.getAddress()));
        const fallback = this.getFallbackConfig();

        try {
            const result = await this.withTimeout(
                this.provider.validateRoute(mapsRoute),
                fallback.timeoutMs
            );
            return result as any;
        } catch (error) {
            if (!fallback.enabled) {
                return { isValid: false, issues: [(error as Error).message || 'Route validation failed'] };
            }
            console.warn('[MapsRoutingBridge] Route validation failed, using inflated haversine fallback.', error);
            return {
                isValid: true,
                issues: ['Routing provider unavailable; using fallback estimate'],
                optimizedVersion: this.buildFallbackRoute(route, fallback.inflationFactor, fallback.avgSpeedKmh)
            };
        }
    }
}
