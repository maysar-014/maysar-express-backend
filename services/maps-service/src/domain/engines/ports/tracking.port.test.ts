import { GeoPoint } from '../../value-objects/geopoint.value-object';
import type { TrackingPort, TrackingUpdate } from './tracking.port';

describe('tracking port contracts', () => {
  it('supports a concrete TrackingPort implementation contract', async () => {
    const point = GeoPoint.create(-6.8, 39.28, 'Dar es Salaam');
    const update: TrackingUpdate = {
      deliveryId: 'delivery-1',
      courierId: 'courier-1',
      location: point,
      speed: 35,
      heading: 90,
      timestamp: new Date('2026-01-01T00:00:00.000Z')
    };
    const port: TrackingPort = {
      storeLocationUpdate: async () => undefined,
      getCourierLocation: async () => point,
      getDeliveryTracking: async () => update,
      getLocationHistory: async () => [update],
      calculateETA: async () => 12,
      detectAnomalies: async () => []
    };

    const eta = await port.calculateETA('delivery-1', point);
    expect(eta).toBe(12);
  });

  it('loads both maps and logistics tracking-port modules', async () => {
    const mapsModule = await import('./tracking.port');
    const logisticsModule = await import('../../../../../logistics-service/src/domain/engines/ports/tracking.port');

    expect(mapsModule).toBeDefined();
    expect(logisticsModule).toBeDefined();
  });
});
