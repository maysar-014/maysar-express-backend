import { WeatherServicePort, WeatherData } from '../../domain/engines/ports/weather.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { getLocalitySummary } from './local-tanzania-locations';

export class MapsWeatherBridge implements WeatherServicePort {
  async getWeatherData(location: GeoPoint): Promise<WeatherData> {
    return this.buildWeather(location, new Date());
  }

  async getWeatherForecast(location: GeoPoint, hours: number): Promise<WeatherData[]> {
    const forecast: WeatherData[] = [];
    const validHours = Math.max(1, Math.min(24, Math.floor(hours || 1)));

    for (let index = 0; index < validHours; index++) {
      forecast.push(this.buildWeather(location, new Date(Date.now() + index * 60 * 60 * 1000)));
    }

    return forecast;
  }

  isWeatherSuitableForDelivery(weather: WeatherData, vehicleType: string): boolean {
    if (weather.severity === 'extreme' || weather.condition === 'storm') {
      return false;
    }

    if (vehicleType === 'bicycle' && weather.severity === 'high') {
      return false;
    }

    return weather.visibility >= 4 && weather.windSpeed < 35;
  }

  private buildWeather(location: GeoPoint, when: Date): WeatherData {
    const locality = getLocalitySummary(location);
    const isDarEsSalaam = locality.regionName === 'DAR-ES-SALAAM';
    const month = when.getMonth();
    const rainySeason = month >= 2 && month <= 4 || month === 10 || month === 11;

    const temperature = isDarEsSalaam ? 29 : 26;
    const humidity = isDarEsSalaam ? 76 : 62;
    const precipitation = rainySeason ? (isDarEsSalaam ? 0.8 : 0.4) : 0.1;
    const windSpeed = isDarEsSalaam ? 16 : 12;
    const visibility = precipitation > 0.5 ? 5 : 10;
    const condition: WeatherData['condition'] = precipitation > 0.7 ? 'rain' : humidity > 75 ? 'cloudy' : 'clear';
    const severity: WeatherData['severity'] = precipitation > 0.7 ? 'medium' : 'low';

    return {
      temperature,
      humidity,
      precipitation,
      windSpeed,
      visibility,
      condition,
      severity
    };
  }
}
