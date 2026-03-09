import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRegistry } from '../../../../maps-service/src/infrastructure/registry';
import { MapsTrackingBridge } from './maps-tracking.bridge';

describe('MapsTrackingBridge', () => {
  const provider = {
    storeLocationUpdate: jest.fn().mockResolvedValue(undefined),
    getCourierLocation: jest.fn(),
    getDeliveryTracking: jest.fn(),
    calculateETA: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(MapsRegistry, 'getInstance').mockReturnValue({
      getTrackingProvider: () => provider
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('stores location updates and injects timestamp when missing', async () => {
    const bridge = new MapsTrackingBridge();
    const location = GeoPoint.create(-6.8, 39.2, 'Dar');

    await bridge.storeLocationUpdate({
      courierId: 'courier-1',
      deliveryId: 'delivery-1',
      location
    } as never);

    const payload = provider.storeLocationUpdate.mock.calls[0][0];
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.location.getLatitude()).toBeCloseTo(-6.8, 5);
  });

  it('converts courier location and keeps null result', async () => {
    const bridge = new MapsTrackingBridge();

    provider.getCourierLocation.mockResolvedValueOnce(null);
    await expect(bridge.getCourierLocation('courier-1')).resolves.toBeNull();

    provider.getCourierLocation.mockResolvedValueOnce({
      getLatitude: () => -6.81,
      getLongitude: () => 39.21,
      getAddress: () => 'Center'
    });
    const result = await bridge.getCourierLocation('courier-2');

    expect(result?.getLatitude()).toBeCloseTo(-6.81, 5);
    expect(result?.getAddress()).toBe('Center');
  });

  it('transforms ETA minutes into estimated arrival timestamp', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    provider.calculateETA.mockResolvedValue(30);
    const bridge = new MapsTrackingBridge();

    const eta = await bridge.calculateETA('delivery-1');

    expect(eta.estimatedArrival.toISOString()).toBe('2026-01-01T10:30:00.000Z');
    expect(eta.confidence).toBe(0.9);
    expect(eta.factors).toEqual({});
  });
});
