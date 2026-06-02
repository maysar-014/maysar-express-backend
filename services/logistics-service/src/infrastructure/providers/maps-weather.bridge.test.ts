import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsWeatherBridge } from './maps-weather.bridge';

describe('MapsWeatherBridge', () => {
  it('returns local weather data for a location', async () => {
    const bridge = new MapsWeatherBridge();
    const location = GeoPoint.create(-6.8, 39.2, 'Dar es Salaam');

    const result = await bridge.getWeatherData(location);

    expect(result).toEqual(expect.objectContaining({
      temperature: expect.any(Number),
      humidity: expect.any(Number),
      precipitation: expect.any(Number),
      windSpeed: expect.any(Number),
      visibility: expect.any(Number),
      condition: expect.any(String),
      severity: expect.any(String)
    }));
  });

  it('returns a forecast array and applies delivery suitability rules', async () => {
    const bridge = new MapsWeatherBridge();
    const location = GeoPoint.create(-6.8, 39.2, 'Dar es Salaam');

    const forecast = await bridge.getWeatherForecast(location, 6);

    expect(forecast).toHaveLength(6);
    expect(forecast[0]).toEqual(expect.objectContaining({ severity: expect.any(String) }));
    expect(bridge.isWeatherSuitableForDelivery(forecast[0], 'motorcycle')).toBe(true);
  });
});
