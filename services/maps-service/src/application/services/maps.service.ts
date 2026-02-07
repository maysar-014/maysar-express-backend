import { RoutingPort, OptimizedRoute, RouteConstraints } from '../../domain/engines/ports/routing.port';
import { TrackingPort, TrackingUpdate } from '../../domain/engines/ports/tracking.port';
import { TrafficPort, TrafficConditions } from '../../domain/engines/ports/traffic.port';
import { WeatherPort, WeatherConditions } from '../../domain/engines/ports/weather.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class MapsService {
    constructor(
        private routingProvider: RoutingPort,
        private trackingProvider: TrackingPort,
        private trafficProvider: TrafficPort,
        private weatherProvider: WeatherPort
    ) { }

    async getOptimalRoute(
        origin: GeoPoint,
        destination: GeoPoint,
        constraints?: RouteConstraints
    ): Promise<OptimizedRoute> {
        return this.routingProvider.calculateOptimalRoute(origin, destination, constraints);
    }

    async updateLocation(update: TrackingUpdate): Promise<void> {
        return this.trackingProvider.storeLocationUpdate(update);
    }

    async getCourierLocation(courierId: string): Promise<GeoPoint | null> {
        return this.trackingProvider.getCourierLocation(courierId);
    }

    async getAreaConditions(location: GeoPoint): Promise<{
        traffic: TrafficConditions;
        weather: WeatherConditions;
    }> {
        const [traffic, weather] = await Promise.all([
            this.trafficProvider.getConditions(location, 5),
            this.weatherProvider.getCurrentWeather(location)
        ]);

        return { traffic, weather };
    }

    async getETA(deliveryId: string, currentLocation: GeoPoint): Promise<number> {
        return this.trackingProvider.calculateETA(deliveryId, currentLocation);
    }
}
