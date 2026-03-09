const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('./logger.service', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { ServiceDiscoveryService } from './service-discovery.service';

describe('ServiceDiscoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers services and resolves healthy service URLs', () => {
    const discovery = new ServiceDiscoveryService();
    discovery.registerService('user-service', 'http://user:3001');

    expect(discovery.getServiceUrl('user-service')).toBe('http://user:3001');
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Service registered',
      { service: 'user-service', url: 'http://user:3001' }
    );
  });

  it('returns null for unknown services and unhealthy services', async () => {
    const discovery = new ServiceDiscoveryService();
    discovery.registerService('order-service', 'http://order:3002');

    expect(discovery.getServiceUrl('unknown')).toBeNull();

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05);
    const health = await discovery.checkServiceHealth('order-service');
    randomSpy.mockRestore();

    expect(health).toBe(false);
    expect(discovery.getServiceUrl('order-service')).toBeNull();
  });

  it('checks health and refreshes all registered services', async () => {
    const discovery = new ServiceDiscoveryService();
    discovery.registerService('catalog-service', 'http://catalog:3003');
    discovery.registerService('wallet-service', 'http://wallet:3004');

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.95);
    const singleHealth = await discovery.checkServiceHealth('catalog-service');
    await discovery.refresh();
    randomSpy.mockRestore();

    expect(singleHealth).toBe(true);
    expect(discovery.getAllServices()).toHaveLength(2);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Service discovery refreshed',
      { serviceCount: 2 }
    );
  });

  it('returns false for health checks on unregistered services', async () => {
    const discovery = new ServiceDiscoveryService();
    const health = await discovery.checkServiceHealth('missing-service');
    expect(health).toBe(false);
  });
});
