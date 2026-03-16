import { DistanceCalculationAlgorithm } from './distance-calculation.algorithm';
import { GeoPoint } from '../value-objects/geopoint.value-object';

describe('DistanceCalculationAlgorithm', () => {
  const origin = GeoPoint.create(0, 0, 'Origin');
  const east = GeoPoint.create(0, 1, 'East');
  const north = GeoPoint.create(1, 0, 'North');

  beforeEach(() => {
    (DistanceCalculationAlgorithm as any).routeOptimizationService = undefined;
  });

  it('calculateBearing returns normalized bearings', () => {
    expect(DistanceCalculationAlgorithm.calculateBearing(origin, east)).toBeCloseTo(90, 0);
    expect(DistanceCalculationAlgorithm.calculateBearing(origin, north)).toBeCloseTo(0, 0);
  });

  it('calculateDeliveryDistance throws when HERE service is not configured', async () => {
    const previousConfig = DistanceCalculationAlgorithm.getFallbackConfigSnapshot();
    DistanceCalculationAlgorithm.configureFallback({ enabled: false });

    await expect(DistanceCalculationAlgorithm.calculateDeliveryDistance(origin, east)).rejects.toThrow(
      'HERE Technologies service is required for distance calculations.'
    );

    DistanceCalculationAlgorithm.configureFallback(previousConfig);
  });

  it('calculateDeliveryDistance uses route service and rounds fields', async () => {
    const routeService = {
      calculateOptimalRoute: jest.fn().mockResolvedValue({
        totalDistance: 12.3456,
        totalDuration: 27.6,
        baseDuration: 22.2,
        trafficDelay: 5.444
      })
    };
    DistanceCalculationAlgorithm.setRouteOptimizationService(routeService as any);

    const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(origin, east);

    expect(routeService.calculateOptimalRoute).toHaveBeenCalledWith(origin, east, undefined);
    expect(result).toEqual(
      expect.objectContaining({
        distance: 12.35,
        duration: 28,
        baseDuration: 22,
        trafficDelay: 5.44
      })
    );
    expect(result.bearing).toBeCloseTo(90, 0);
  });

  it('isWithinRadius compares calculated route distance to radius threshold', async () => {
    const routeService = {
      calculateOptimalRoute: jest.fn().mockResolvedValue({
        totalDistance: 4.2,
        totalDuration: 10,
        baseDuration: 8,
        trafficDelay: 2
      })
    };
    DistanceCalculationAlgorithm.setRouteOptimizationService(routeService as any);

    await expect(DistanceCalculationAlgorithm.isWithinRadius(origin, east, 5)).resolves.toBe(true);
    await expect(DistanceCalculationAlgorithm.isWithinRadius(origin, east, 4)).resolves.toBe(false);
  });

  it('calculateMidpoint returns midpoint geopoint with composed address', () => {
    const midpoint = DistanceCalculationAlgorithm.calculateMidpoint(
      GeoPoint.create(-6.79, 39.2, 'A'),
      GeoPoint.create(-6.81, 39.24, 'B')
    );

    expect(midpoint.getAddress()).toBe('Midpoint of A and B');
    expect(midpoint.getLatitude()).toBeCloseTo(-6.8, 1);
    expect(midpoint.getLongitude()).toBeCloseTo(39.22, 1);
  });

  it('calculateRouteDistance returns 0 for <2 waypoints and sums segment distances', async () => {
    expect(await DistanceCalculationAlgorithm.calculateRouteDistance([origin])).toBe(0);

    const routeService = {
      calculateOptimalRoute: jest
        .fn()
        .mockResolvedValueOnce({
          totalDistance: 4.2,
          totalDuration: 10,
          baseDuration: 8,
          trafficDelay: 2
        })
        .mockResolvedValueOnce({
          totalDistance: 5.111,
          totalDuration: 14,
          baseDuration: 10,
          trafficDelay: 4
        })
    };
    DistanceCalculationAlgorithm.setRouteOptimizationService(routeService as any);

    const total = await DistanceCalculationAlgorithm.calculateRouteDistance([
      origin,
      east,
      GeoPoint.create(0.1, 1.2, 'Third')
    ]);

    expect(total).toBe(9.31);
  });
});
