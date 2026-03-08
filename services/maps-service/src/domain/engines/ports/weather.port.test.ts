import { GeoPoint } from '../../value-objects/geopoint.value-object';
import type { WeatherConditions, WeatherPort } from './weather.port';

describe('weather port contracts', () => {
  it('supports a concrete WeatherPort implementation contract', async () => {
    const point = GeoPoint.create(-6.8, 39.28, 'Dar es Salaam');
    const conditions: WeatherConditions = {
      temperature: 28,
      condition: 'clear',
      visibility: 9,
      precipitationProbability: 0.1,
      windSpeed: 10
    };
    const port: WeatherPort = {
      getCurrentWeather: async () => conditions,
      getForecast: async () => conditions
    };

    const current = await port.getCurrentWeather(point);
    expect(current.condition).toBe('clear');
  });

  it('loads both maps and logistics weather-port modules', async () => {
    const mapsModule = await import('./weather.port');
    const logisticsModule = await import('../../../../../logistics-service/src/domain/engines/ports/weather.port');

    expect(mapsModule).toBeDefined();
    expect(logisticsModule).toBeDefined();
  });
});
