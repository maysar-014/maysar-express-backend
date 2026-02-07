import { RouteOptimizationPort, OptimizedRoute, RouteConstraints } from '../../domain/engines/ports/route-optimization.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRegistry } from '../../../../maps-service/src/infrastructure/registry';
import { GeoPoint as MapsGeoPoint } from '../../../../maps-service/src/domain/value-objects/geopoint.value-object';

export class MapsRoutingBridge implements RouteOptimizationPort {
    private get provider() {
        return MapsRegistry.getInstance().getRoutingProvider();
    }

    async calculateOptimalRoute(origin: GeoPoint, destination: GeoPoint, constraints?: RouteConstraints): Promise<OptimizedRoute> {
        const mapsOrigin = MapsGeoPoint.create(origin.getLatitude(), origin.getLongitude(), origin.getAddress());
        const mapsDest = MapsGeoPoint.create(destination.getLatitude(), destination.getLongitude(), destination.getAddress());

        // Constraints mapping if needed

        const result = await this.provider.calculateOptimalRoute(mapsOrigin, mapsDest, constraints as any);

        // Map back to Logistics GeoPoint if necessary
        return result as any;
    }

    async calculateMultiStopRoute(waypoints: GeoPoint[], constraints?: RouteConstraints): Promise<OptimizedRoute> {
        const mapsWaypoints = waypoints.map(wp => MapsGeoPoint.create(wp.getLatitude(), wp.getLongitude(), wp.getAddress()));
        const result = await this.provider.calculateMultiStopRoute(mapsWaypoints, constraints as any);
        return result as any;
    }

    async getRouteAlternatives(origin: GeoPoint, destination: GeoPoint, count: number): Promise<OptimizedRoute[]> {
        const mapsOrigin = MapsGeoPoint.create(origin.getLatitude(), origin.getLongitude(), origin.getAddress());
        const mapsDest = MapsGeoPoint.create(destination.getLatitude(), destination.getLongitude(), destination.getAddress());
        const result = await this.provider.getRouteAlternatives(mapsOrigin, mapsDest, count);
        return result as any;
    }

    async validateRoute(route: GeoPoint[]): Promise<{ isValid: boolean; issues: string[]; optimizedVersion?: OptimizedRoute; }> {
        const mapsRoute = route.map(wp => MapsGeoPoint.create(wp.getLatitude(), wp.getLongitude(), wp.getAddress()));
        const result = await this.provider.validateRoute(mapsRoute);
        return result as any;
    }
}
