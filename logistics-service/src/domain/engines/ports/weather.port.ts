import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  visibility: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm';
  severity: 'low' | 'medium' | 'high' | 'extreme';
}

export interface WeatherServicePort {
  getWeatherData(location: GeoPoint): Promise<WeatherData>;
  getWeatherForecast(location: GeoPoint, hours: number): Promise<WeatherData[]>;
  isWeatherSuitableForDelivery(weather: WeatherData, vehicleType: string): boolean;
}
