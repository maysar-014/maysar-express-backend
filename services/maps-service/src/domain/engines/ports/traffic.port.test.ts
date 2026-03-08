import { GeoPoint } from '../../value-objects/geopoint.value-object';
import type { TrafficConditions, TrafficPort } from './traffic.port';

describe('traffic port contracts', () => {
  it('supports a concrete TrafficPort implementation contract', async () => {
    const point = GeoPoint.create(-6.8, 39.28, 'Dar es Salaam');
    const conditions: TrafficConditions = {
      level: 'moderate',
      averageSpeed: 42,
      delayMinutes: 8,
      incidents: []
    };
    const port: TrafficPort = {
      getConditions: async () => conditions,
      getRouteTraffic: async () => conditions,
      predictTraffic: async () => conditions
    };

    const result = await port.getConditions(point, 5);
    expect(result.level).toBe('moderate');
  });

  it('loads both maps and logistics traffic-port modules', async () => {
    const mapsModule = await import('./traffic.port');
    const logisticsModule = await import('../../../../../logistics-service/src/domain/engines/ports/traffic.port');

    expect(mapsModule).toBeDefined();
    expect(logisticsModule).toBeDefined();
  });
});
