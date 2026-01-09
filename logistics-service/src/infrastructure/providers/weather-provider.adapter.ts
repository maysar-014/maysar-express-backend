import { WeatherServicePort, WeatherData } from '../../domain/engines/ports/weather.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class WeatherProviderAdapter implements WeatherServicePort {
  constructor(private apiKey?: string) {}

  async getWeatherData(location: GeoPoint): Promise<WeatherData> {
    try {
      if (!this.apiKey) {
        console.warn('No OpenWeatherMap API key provided, using fallback data');
        return this.getFallbackWeatherData(location);
      }

      const coords = location.getCoordinates();

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      return {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind?.speed || 0),
        precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
        visibility: (data.visibility || 10000) / 1000, // Convert to km
        condition: this.mapWeatherCondition(data.weather?.[0]?.main || 'Clear'),
        severity: this.calculateSeverity(data)
      };

    } catch (error) {
      console.error('Error fetching weather data:', error);
      return this.getFallbackWeatherData(location);
    }
  }

  async getWeatherForecast(location: GeoPoint, hours: number): Promise<WeatherData[]> {
    // Mock implementation - return current weather for each hour
    const currentWeather = await this.getWeatherData(location);
    return Array.from({ length: hours }, () => ({ ...currentWeather }));
  }

  isWeatherSuitableForDelivery(weather: WeatherData, vehicleType: string): boolean {
    // Business logic for weather suitability based on vehicle type
    if (weather.severity === 'extreme') {
      return false;
    }

    if (weather.severity === 'high') {
      // Only motorcycles can handle high severity weather
      return vehicleType === 'motorcycle';
    }

    // Medium and low severity are suitable for all vehicles
    return weather.severity === 'low' || weather.severity === 'medium';
  }

  private calculateSeverity(data: any): 'low' | 'medium' | 'high' {
    const rain = data.rain?.['1h'] || 0;
    const wind = data.wind?.speed || 0;
    const visibility = data.visibility || 10000;

    if (rain > 5 || wind > 20 || visibility < 2000) {
      return 'high';
    } else if (rain > 1 || wind > 10 || visibility < 5000) {
      return 'medium';
    }
    return 'low';
  }

  private mapWeatherCondition(apiCondition: string): 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm' {
    const conditionMap: Record<string, 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm'> = {
      'Clear': 'clear',
      'Clouds': 'cloudy',
      'Rain': 'rain',
      'Drizzle': 'rain',
      'Thunderstorm': 'storm',
      'Snow': 'snow',
      'Mist': 'fog',
      'Fog': 'fog',
      'Haze': 'fog'
    };

    return conditionMap[apiCondition] || 'clear';
  }

  private getFallbackWeatherData(location: GeoPoint): WeatherData {
    // Deterministic fallback based on location
    const coords = location.getCoordinates();
    const scenarioIndex = Math.abs(Math.floor((coords.lat + coords.lng) * 10)) % 3;

    const scenarios: WeatherData[] = [
      { temperature: 28, humidity: 65, windSpeed: 12, precipitation: 0, visibility: 10, condition: 'clear', severity: 'low' },
      { temperature: 25, humidity: 80, windSpeed: 25, precipitation: 2, visibility: 8, condition: 'cloudy', severity: 'medium' },
      { temperature: 22, humidity: 90, windSpeed: 35, precipitation: 8, visibility: 3, condition: 'rain', severity: 'high' }
    ];

    return scenarios[scenarioIndex];
  }
}
