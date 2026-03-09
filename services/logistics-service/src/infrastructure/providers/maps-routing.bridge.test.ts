import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRoutingBridge } from './maps-routing.bridge';

describe('MapsRoutingBridge', () => {
  it('delegates route calculations to provided routing provider', async () => {
    const provider = {
      calculateOptimalRoute: jest.fn().mockResolvedValue({ routeId: 'r-1' }),
      calculateMultiStopRoute: jest.fn().mockResolvedValue({ routeId: 'multi-1' }),
      getRouteAlternatives: jest.fn().mockResolvedValue([{ routeId: 'alt-1' }]),
      validateRoute: jest.fn().mockResolvedValue({ isValid: true, issues: [] })
    };
    const bridge = new MapsRoutingBridge(provider as never);
    const origin = GeoPoint.create(-6.8, 39.2, 'Origin');
    const destination = GeoPoint.create(-6.9, 39.3, 'Destination');

    await expect(bridge.calculateOptimalRoute(origin, destination)).resolves.toEqual({ routeId: 'r-1' });
    await expect(bridge.calculateMultiStopRoute([origin, destination])).resolves.toEqual({ routeId: 'multi-1' });
    await expect(bridge.getRouteAlternatives(origin, destination, 1)).resolves.toEqual([{ routeId: 'alt-1' }]);
    await expect(bridge.validateRoute([origin, destination])).resolves.toEqual({ isValid: true, issues: [] });

    expect(provider.calculateOptimalRoute).toHaveBeenCalledWith(
      expect.objectContaining({ getLatitude: expect.any(Function) }),
      expect.objectContaining({ getLongitude: expect.any(Function) }),
      undefined
    );
    expect(provider.calculateMultiStopRoute).toHaveBeenCalledTimes(1);
    expect(provider.getRouteAlternatives).toHaveBeenCalledTimes(1);
    expect(provider.validateRoute).toHaveBeenCalledTimes(1);
  });

  it('throws when no provider is injected and HERE_API_KEY is missing', () => {
    const original = process.env.HERE_API_KEY;
    delete process.env.HERE_API_KEY;

    expect(() => new MapsRoutingBridge()).toThrow('HERE_API_KEY is required');

    if (original === undefined) {
      delete process.env.HERE_API_KEY;
    } else {
      process.env.HERE_API_KEY = original;
    }
  });
});
