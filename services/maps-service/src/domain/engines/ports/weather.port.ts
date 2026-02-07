import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface WeatherConditions {
    temperature: number;
    condition: 'clear' | 'rain' | 'storm' | 'fog' | 'extreme';
    visibility: number;
    precipitationProbability: number;
    windSpeed: number;
}

export interface WeatherPort {
    getCurrentWeather(location: GeoPoint): Promise<WeatherConditions>;
    getForecast(location: GeoPoint, time: Date): Promise<WeatherConditions>;
}
