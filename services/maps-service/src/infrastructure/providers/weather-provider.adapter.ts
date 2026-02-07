/**
 * Weather Provider Adapter
 *
 * Constitution Section 8: Infrastructure Isolation Rule
 */

import {
    WeatherPort,
    WeatherConditions
} from '../../domain/engines/ports/weather.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class WeatherProviderAdapter implements WeatherPort {
    constructor(private apiKey?: string) { }

    async getCurrentWeather(location: GeoPoint): Promise<WeatherConditions> {
        try {
            if (!this.apiKey) {
                return this.getFallbackWeather(location);
            }

            const coords = location.getCoordinates();
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&appid=${this.apiKey}&units=metric`
            );

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();
            return this.mapGoogleWeather(data);
        } catch (error) {
            console.error('Error fetching current weather:', error);
            return this.getFallbackWeather(location);
        }
    }

    async getForecast(location: GeoPoint, time: Date): Promise<WeatherConditions> {
        // Basic forecast return current for now
        return this.getCurrentWeather(location);
    }

    private mapGoogleWeather(data: any): WeatherConditions {
        const main = data.main;
        const weather = data.weather?.[0];

        const temp = Math.round(main.temp);
        const condition = this.parseCondition(weather?.main || 'Clear');

        return {
            temperature: temp,
            condition,
            visibility: (data.visibility || 10000) / 1000,
            precipitationProbability: data.rain?.['1h'] ? 80 : 0,
            windSpeed: data.wind?.speed || 0
        };
    }

    private parseCondition(apiCondition: string): WeatherConditions['condition'] {
        const map: Record<string, WeatherConditions['condition']> = {
            'Clear': 'clear',
            'Rain': 'rain',
            'Drizzle': 'rain',
            'Thunderstorm': 'storm',
            'Snow': 'extreme',
            'Mist': 'fog',
            'Fog': 'fog'
        };
        return map[apiCondition] || 'clear';
    }

    private getFallbackWeather(location: GeoPoint): WeatherConditions {
        return {
            temperature: 25,
            condition: 'clear',
            visibility: 10,
            precipitationProbability: 0,
            windSpeed: 5
        };
    }
}
