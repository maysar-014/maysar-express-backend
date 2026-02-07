import { TrafficServicePort, TrafficData, TrafficIncident } from '../../domain/engines/ports/traffic.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRegistry } from '../../../../maps-service/src/infrastructure/registry';
import { GeoPoint as MapsGeoPoint } from '../../../../maps-service/src/domain/value-objects/geopoint.value-object';

export class MapsTrafficBridge implements TrafficServicePort {
    private get provider() {
        return MapsRegistry.getInstance().getTrafficProvider();
    }

    async getTrafficData(origin: GeoPoint, destination: GeoPoint): Promise<TrafficData> {
        const mapsOrigin = MapsGeoPoint.create(origin.getLatitude(), origin.getLongitude(), origin.getAddress());
        const mapsDest = MapsGeoPoint.create(destination.getLatitude(), destination.getLongitude(), destination.getAddress());
        const traffic = await this.provider.getConditions(mapsOrigin, 5);
        return traffic as any;
    }

    async getRouteTraffic(route: GeoPoint[]): Promise<TrafficData[]> {
        const mapsRoute = route.map(wp => MapsGeoPoint.create(wp.getLatitude(), wp.getLongitude(), wp.getAddress()));
        const traffic = await this.provider.getRouteTraffic(mapsRoute);
        return [traffic as any];
    }

    async getTrafficIncidents(location: GeoPoint, radius: number): Promise<TrafficIncident[]> {
        return [];
    }

    async calculateRouteWithTraffic(origin: GeoPoint, destination: GeoPoint): Promise<any> {
        return null;
    }
}
