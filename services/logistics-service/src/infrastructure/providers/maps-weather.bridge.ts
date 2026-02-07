import { WeatherServicePort, WeatherData } from '../../domain/engines/ports/weather.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRegistry } from '../../../../maps-service/src/infrastructure/registry';
import { GeoPoint as MapsGeoPoint } from '../../../../maps-service/src/domain/value-objects/geopoint.value-object';

export class MapsWeatherBridge implements WeatherServicePort {
    private get provider() {
        return MapsRegistry.getInstance().getWeatherProvider();
    }

    async getWeatherData(location: GeoPoint): Promise<WeatherData> {
        const mapsLoc = MapsGeoPoint.create(location.getLatitude(), location.getLongitude(), location.getAddress());
        const weather = await this.provider.getCurrentWeather(mapsLoc);
        return weather as any;
    }

    async getWeatherForecast(location: GeoPoint, hours: number): Promise<WeatherData[]> {
        const mapsLoc = MapsGeoPoint.create(location.getLatitude(), location.getLongitude(), location.getAddress());
        const weather = await this.provider.getForecast(mapsLoc, new Date());
        return [weather as any];
    }

    isWeatherSuitableForDelivery(weather: WeatherData, vehicleType: string): boolean {
        return true; // Simplified
    }
}
