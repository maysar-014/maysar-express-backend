import { GeoPoint } from '../../value-objects/geopoint.value-object';
import type { OptimizedRoute, RouteConstraints, RoutingPort } from './routing.port';

describe('RoutingPort contract', () => {
  it('supports route planning, alternatives, and validation operations', async () => {
    const origin = GeoPoint.fromCoordinates(-6.7924, 39.2083, 'Dar es Salaam CBD');
    const destination = GeoPoint.fromCoordinates(-6.8156, 39.2862, 'Mikocheni');
    const constraints: RouteConstraints = {
      avoidHighways: false,
      vehicleType: 'car'
    };

    const route: OptimizedRoute = {
      segments: [
        {
          start: origin,
          end: destination,
          distance: 13.5,
          duration: 34,
          roadType: 'main_road',
          trafficLevel: 30
        }
      ],
      totalDistance: 13.5,
      totalDuration: 34,
      waypoints: [origin, destination],
      efficiency: 90,
      confidence: 0.92,
      alternatives: []
    };

    const port: RoutingPort = {
      calculateOptimalRoute: jest.fn().mockResolvedValue(route),
      calculateMultiStopRoute: jest.fn().mockResolvedValue(route),
      getRouteAlternatives: jest.fn().mockResolvedValue([route]),
      validateRoute: jest.fn().mockResolvedValue({ isValid: true, issues: [] })
    };

    expect(await port.calculateOptimalRoute(origin, destination, constraints)).toBe(route);
    expect(await port.calculateMultiStopRoute([origin, destination], constraints)).toBe(route);
    expect(await port.getRouteAlternatives(origin, destination, 1)).toEqual([route]);
    await expect(port.validateRoute([origin, destination])).resolves.toEqual({
      isValid: true,
      issues: []
    });
  });
});
