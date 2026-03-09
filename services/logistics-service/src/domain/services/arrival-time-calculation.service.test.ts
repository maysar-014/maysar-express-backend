import { GeoPoint } from '../value-objects/geopoint.value-object';
import { ArrivalTimeCalculationService } from './arrival-time-calculation.service';

describe('ArrivalTimeCalculationService', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterAll(() => {
    warnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const from = GeoPoint.create(-6.79, 39.2, 'Origin');
  const to = GeoPoint.create(-6.8, 39.21, 'Destination');
  const localDateAtHour = (hour: number): Date => {
    const date = new Date('2026-03-08T00:00:00');
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  it('uses fallback multipliers when providers are not configured', async () => {
    const service = new ArrivalTimeCalculationService({} as any);
    const result = await service.calculateEstimatedArrivalTime(
      from,
      to,
      'motorcycle',
      localDateAtHour(8)
    );

    expect(result.factors.trafficMultiplier).toBe(1.3);
    expect(result.factors.weatherMultiplier).toBe(1);
    expect(result.factors.timeOfDayMultiplier).toBe(1.3);
    expect(result.confidence).toBe(80);
    expect(result.estimatedMinutes).toBeGreaterThan(0);
  });

  it('uses provider data and computes high confidence with both providers', async () => {
    const trafficProvider = {
      getTrafficData: jest.fn().mockResolvedValue({ multiplier: 1.4 })
    };
    const weatherProvider = {
      getWeatherData: jest.fn().mockResolvedValue({ condition: 'heavy rain' })
    };
    const service = new ArrivalTimeCalculationService({} as any, trafficProvider, weatherProvider);

    const result = await service.calculateEstimatedArrivalTime(
      from,
      GeoPoint.create(-7.05, 39.5, 'Far Destination'),
      'truck',
      new Date('2026-03-08T12:00:00.000Z')
    );

    expect(trafficProvider.getTrafficData).toHaveBeenCalled();
    expect(weatherProvider.getWeatherData).toHaveBeenCalled();
    expect(result.factors.trafficMultiplier).toBe(1.4);
    expect(result.factors.weatherMultiplier).toBe(1.3);
    expect(result.confidence).toBe(80);
  });

  it('falls back when traffic provider throws and logs warning', async () => {
    const trafficProvider = {
      getTrafficData: jest.fn().mockRejectedValue(new Error('traffic timeout'))
    };
    const service = new ArrivalTimeCalculationService({} as any, trafficProvider);

    const result = await service.calculateEstimatedArrivalTime(
      from,
      to,
      'car',
      localDateAtHour(23)
    );

    expect(result.factors.trafficMultiplier).toBe(0.9);
    expect(warnSpy).toHaveBeenCalledWith('Failed to get traffic data, using fallback:', expect.any(Error));
  });

  it('falls back when weather provider throws and logs warning', async () => {
    const weatherProvider = {
      getWeatherData: jest.fn().mockRejectedValue(new Error('weather timeout'))
    };
    const service = new ArrivalTimeCalculationService({} as any, undefined, weatherProvider);

    const result = await service.calculateEstimatedArrivalTime(
      from,
      to,
      'unknown-vehicle',
      new Date('2026-03-08T13:00:00.000Z')
    );

    expect(result.factors.weatherMultiplier).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith('Failed to get weather data:', expect.any(Error));
  });

  it('maps weather conditions to expected multipliers', async () => {
    const conditions = [
      { condition: 'clear', expected: 1 },
      { condition: 'cloudy', expected: 1.05 },
      { condition: 'rain', expected: 1.15 },
      { condition: 'snow', expected: 1.5 },
      { condition: 'fog', expected: 1.2 },
      { condition: 'unknown', expected: 1 }
    ];

    for (const { condition, expected } of conditions) {
      const weatherProvider = {
        getWeatherData: jest.fn().mockResolvedValue({ condition })
      };
      const service = new ArrivalTimeCalculationService({} as any, undefined, weatherProvider);
      const result = await service.calculateEstimatedArrivalTime(from, to, 'car');
      expect(result.factors.weatherMultiplier).toBe(expected);
    }
  });

  it('calculateMultipleArrivalTimes computes each leg sequentially', async () => {
    const service = new ArrivalTimeCalculationService({} as any);
    const spy = jest
      .spyOn(service, 'calculateEstimatedArrivalTime')
      .mockResolvedValueOnce({
        estimatedMinutes: 10,
        distanceKm: 3,
        factors: { distance: 3, trafficMultiplier: 1, weatherMultiplier: 1, timeOfDayMultiplier: 1 },
        confidence: 80
      })
      .mockResolvedValueOnce({
        estimatedMinutes: 20,
        distanceKm: 6,
        factors: { distance: 6, trafficMultiplier: 1, weatherMultiplier: 1, timeOfDayMultiplier: 1 },
        confidence: 80
      });

    const nextDestination = GeoPoint.create(-6.81, 39.23, 'B');
    const start = localDateAtHour(10);
    const results = await service.calculateMultipleArrivalTimes(from, [to, nextDestination], 'car', start);

    expect(results).toHaveLength(2);
    expect(spy).toHaveBeenNthCalledWith(1, from, to, 'car', start);
    expect(spy).toHaveBeenNthCalledWith(
      2,
      from,
      nextDestination,
      'car',
      new Date(start.getTime() + 10 * 60 * 1000)
    );
  });
});
