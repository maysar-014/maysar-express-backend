import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRegistry } from '../../../../maps-service/src/infrastructure/registry';
import { MapsWeatherBridge } from './maps-weather.bridge';

describe('MapsWeatherBridge', () => {
  const provider = {
    getCurrentWeather: jest.fn(),
    getForecast: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(MapsRegistry, 'getInstance').mockReturnValue({
      getWeatherProvider: () => provider
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads current weather for location', async () => {
    provider.getCurrentWeather.mockResolvedValue({ condition: 'CLEAR' });
    const bridge = new MapsWeatherBridge();
    const location = GeoPoint.create(-6.8, 39.2, 'Dar');

    const result = await bridge.getWeatherData(location);

    expect(provider.getCurrentWeather).toHaveBeenCalledWith(
      expect.objectContaining({ getLatitude: expect.any(Function) })
    );
    expect(result).toEqual({ condition: 'CLEAR' });
  });

  it('returns forecast as single-item array and keeps suitability simplified', async () => {
    provider.getForecast.mockResolvedValue({ condition: 'RAIN' });
    const bridge = new MapsWeatherBridge();
    const location = GeoPoint.create(-6.8, 39.2, 'Dar');

    await expect(bridge.getWeatherForecast(location, 6)).resolves.toEqual([{ condition: 'RAIN' }]);
    expect(bridge.isWeatherSuitableForDelivery({} as never, 'bike')).toBe(true);
  });
});
