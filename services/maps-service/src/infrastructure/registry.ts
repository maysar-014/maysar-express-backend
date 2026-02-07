import { RoutingPort } from '../domain/engines/ports/routing.port';
import { TrackingPort } from '../domain/engines/ports/tracking.port';
import { TrafficPort } from '../domain/engines/ports/traffic.port';
import { WeatherPort } from '../domain/engines/ports/weather.port';
import { MapsService } from '../application/services/maps.service';

export class MapsRegistry {
    private static instance: MapsRegistry;
    private routingProvider!: RoutingPort;
    private trackingProvider!: TrackingPort;
    private trafficProvider!: TrafficPort;
    private weatherProvider!: WeatherPort;
    private mapsService!: MapsService;

    private constructor() { }

    static getInstance(): MapsRegistry {
        if (!MapsRegistry.instance) {
            MapsRegistry.instance = new MapsRegistry();
        }
        return MapsRegistry.instance;
    }

    registerRoutingProvider(provider: RoutingPort): void {
        this.routingProvider = provider;
    }

    registerTrackingProvider(provider: TrackingPort): void {
        this.trackingProvider = provider;
    }

    registerTrafficProvider(provider: TrafficPort): void {
        this.trafficProvider = provider;
    }

    registerWeatherProvider(provider: WeatherPort): void {
        this.weatherProvider = provider;
    }

    getMapsService(): MapsService {
        if (!this.mapsService) {
            this.mapsService = new MapsService(
                this.routingProvider,
                this.trackingProvider,
                this.trafficProvider,
                this.weatherProvider
            );
        }
        return this.mapsService;
    }

    getRoutingProvider(): RoutingPort { return this.routingProvider; }
    getTrackingProvider(): TrackingPort { return this.trackingProvider; }
    getTrafficProvider(): TrafficPort { return this.trafficProvider; }
    getWeatherProvider(): WeatherPort { return this.weatherProvider; }
}
