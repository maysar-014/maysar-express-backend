import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsTrafficBridge } from './maps-traffic.bridge';

describe('MapsTrafficBridge', () => {
  it('returns local traffic data between two points', async () => {
    const origin = GeoPoint.create(-6.8, 39.2, 'Dar es Salaam CBD');
    const destination = GeoPoint.create(-6.9, 39.3, 'Msasani');
    const bridge = new MapsTrafficBridge();

    const result = await bridge.getTrafficData(origin, destination);

    expect(result.congestionLevel).toBeGreaterThanOrEqual(0);
    expect(result.averageSpeed).toBeGreaterThan(0);
    expect(result.travelTime).toBeGreaterThan(0);
    expect(result.roadConditions).toMatch(/good|fair|poor|closed/);
  });

  it('returns route traffic arrays and local incidents when relevant', async () => {
    const bridge = new MapsTrafficBridge();
    const route = [
      GeoPoint.create(-6.8, 39.2, 'A'),
      GeoPoint.create(-6.81, 39.21, 'B')
    ];

    const routeTraffic = await bridge.getRouteTraffic(route);
    const incidents = await bridge.getTrafficIncidents(route[0], 5);
    const calculatedRoute = await bridge.calculateRouteWithTraffic(route[0], route[1]);

    expect(routeTraffic).toHaveLength(1);
    expect(routeTraffic[0].travelTime).toBeGreaterThan(0);
    expect(Array.isArray(incidents)).toBe(true);
    expect(calculatedRoute.optimalRoute).toEqual(route);
    expect(calculatedRoute.estimatedTime).toBeGreaterThan(0);
  });
});
