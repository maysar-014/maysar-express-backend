jest.mock('../application/services/maps.service', () => ({
  MapsService: jest.fn().mockImplementation(
    (routing: unknown, tracking: unknown, traffic: unknown, weather: unknown) => ({
      routing,
      tracking,
      traffic,
      weather
    })
  )
}));

import { MapsService } from '../application/services/maps.service';
import { MapsRegistry } from './registry';

describe('MapsRegistry', () => {
  beforeEach(() => {
    (MapsRegistry as any).instance = undefined;
    jest.clearAllMocks();
  });

  it('returns a singleton instance', () => {
    const first = MapsRegistry.getInstance();
    const second = MapsRegistry.getInstance();

    expect(first).toBe(second);
  });

  it('registers and exposes providers', () => {
    const registry = MapsRegistry.getInstance();
    const routing = { calculateRoute: jest.fn() };
    const tracking = { trackVehicle: jest.fn() };
    const traffic = { getTrafficData: jest.fn() };
    const weather = { getWeatherData: jest.fn() };

    registry.registerRoutingProvider(routing as never);
    registry.registerTrackingProvider(tracking as never);
    registry.registerTrafficProvider(traffic as never);
    registry.registerWeatherProvider(weather as never);

    expect(registry.getRoutingProvider()).toBe(routing);
    expect(registry.getTrackingProvider()).toBe(tracking);
    expect(registry.getTrafficProvider()).toBe(traffic);
    expect(registry.getWeatherProvider()).toBe(weather);
  });

  it('creates MapsService lazily and reuses the same instance', () => {
    const registry = MapsRegistry.getInstance();
    const routing = { id: 'routing' };
    const tracking = { id: 'tracking' };
    const traffic = { id: 'traffic' };
    const weather = { id: 'weather' };
    registry.registerRoutingProvider(routing as never);
    registry.registerTrackingProvider(tracking as never);
    registry.registerTrafficProvider(traffic as never);
    registry.registerWeatherProvider(weather as never);

    const first = registry.getMapsService();
    const second = registry.getMapsService();

    expect(first).toBe(second);
    expect(MapsService).toHaveBeenCalledTimes(1);
    expect(MapsService).toHaveBeenCalledWith(routing, tracking, traffic, weather);
  });
});
