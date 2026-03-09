import { GeoPoint } from '../../value-objects/geopoint.value-object';
import type {
  OptimizedRoute,
  RouteConstraints,
  RouteOptimizationPort
} from './route-optimization.port';

describe('RouteOptimizationPort contract', () => {
  it('supports route planning, alternatives, and validation operations', async () => {
    const origin = GeoPoint.fromCoordinates(-6.7924, 39.2083, 'Dar es Salaam CBD');
    const destination = GeoPoint.fromCoordinates(-6.8156, 39.2862, 'Mikocheni');
    const constraints: RouteConstraints = {
      maxDuration: 45,
      priority: 'fastest'
    };

    const optimizedRoute: OptimizedRoute = {
      segments: [
        {
          start: origin,
          end: destination,
          distance: 13.2,
          duration: 32,
          roadType: 'main_road',
          trafficLevel: 35
        }
      ],
      totalDistance: 13.2,
      totalDuration: 32,
      baseDuration: 26,
      trafficDelay: 6,
      waypoints: [origin, destination],
      efficiency: 91,
      confidence: 0.94,
      alternatives: []
    };

    const optimizer: RouteOptimizationPort = {
      calculateOptimalRoute: jest.fn().mockResolvedValue(optimizedRoute),
      calculateMultiStopRoute: jest.fn().mockResolvedValue(optimizedRoute),
      getRouteAlternatives: jest.fn().mockResolvedValue([optimizedRoute]),
      validateRoute: jest.fn().mockResolvedValue({ isValid: true, issues: [] })
    };

    expect(await optimizer.calculateOptimalRoute(origin, destination, constraints)).toBe(optimizedRoute);
    expect(await optimizer.calculateMultiStopRoute([origin, destination], constraints)).toBe(optimizedRoute);
    expect(await optimizer.getRouteAlternatives(origin, destination, 1)).toEqual([optimizedRoute]);
    await expect(optimizer.validateRoute([origin, destination])).resolves.toEqual({
      isValid: true,
      issues: []
    });
  });
});
