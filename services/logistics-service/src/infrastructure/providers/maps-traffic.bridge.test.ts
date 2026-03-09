import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRegistry } from '../../../../maps-service/src/infrastructure/registry';
import { MapsTrafficBridge } from './maps-traffic.bridge';

describe('MapsTrafficBridge', () => {
  const provider = {
    getConditions: jest.fn(),
    getRouteTraffic: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(MapsRegistry, 'getInstance').mockReturnValue({
      getTrafficProvider: () => provider
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads traffic data between two points', async () => {
    const origin = GeoPoint.create(-6.8, 39.2, 'A');
    const destination = GeoPoint.create(-6.9, 39.3, 'B');
    provider.getConditions.mockResolvedValue({ status: 'MODERATE' });
    const bridge = new MapsTrafficBridge();

    const result = await bridge.getTrafficData(origin, destination);

    expect(provider.getConditions).toHaveBeenCalledWith(
      expect.objectContaining({ getLatitude: expect.any(Function) }),
      5
    );
    expect(result).toEqual({ status: 'MODERATE' });
  });

  it('wraps route traffic into array and returns defaults for unimplemented methods', async () => {
    const route = [GeoPoint.create(-6.8, 39.2, 'A'), GeoPoint.create(-6.9, 39.3, 'B')];
    provider.getRouteTraffic.mockResolvedValue({ routeStatus: 'HEAVY' });
    const bridge = new MapsTrafficBridge();

    await expect(bridge.getRouteTraffic(route)).resolves.toEqual([{ routeStatus: 'HEAVY' }]);
    await expect(bridge.getTrafficIncidents(route[0], 5)).resolves.toEqual([]);
    await expect(bridge.calculateRouteWithTraffic(route[0], route[1])).resolves.toBeNull();
  });
});
