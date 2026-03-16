const mockCreateUserServiceClient = jest.fn(() => ({ name: 'user-service-client' }));
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.useFakeTimers();

jest.mock('../clients/user-service.client', () => ({
  createUserServiceClient: (...args: unknown[]) => mockCreateUserServiceClient(...args)
}));

jest.mock('./logger.service', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    debug: jest.fn()
  }
}));

import { ServiceDiscovery, serviceDiscovery } from './service-discovery';

describe('ServiceDiscovery', () => {
  const created: ServiceDiscovery[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    created.forEach(instance => instance.stop());
    created.length = 0;
    serviceDiscovery.stop();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const createDiscovery = (): ServiceDiscovery => {
    const instance = new ServiceDiscovery({
      services: {
        userService: {
          urls: ['http://u1:3001', 'http://u2:3001'],
          healthCheckPath: '/health',
          timeout: 100
        }
      },
      healthCheckInterval: 500,
      failureThreshold: 2,
      recoveryTimeout: 5000
    });
    created.push(instance);
    return instance;
  };

  it('initializes service instances and reports health summary', () => {
    const discovery = createDiscovery();
    const health = discovery.getServiceHealth();

    expect(health.userService.totalInstances).toBe(2);
    expect(health.userService.healthyInstances).toBe(2);
    expect(health.userService.unhealthyInstances).toBe(0);
  });

  it('creates user service client from healthy instance and handles no-healthy case', () => {
    const discovery = createDiscovery();

    const client = discovery.getUserServiceClient();
    expect(client).toEqual(expect.objectContaining({ name: 'user-service-client' }));
    expect(mockCreateUserServiceClient).toHaveBeenCalled();

    const instances = (discovery as unknown as { services: Map<string, Array<{ healthy: boolean }>> }).services.get('userService') || [];
    instances.forEach(instance => {
      instance.healthy = false;
    });

    const unavailable = discovery.getUserServiceClient();
    expect(unavailable).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith('No healthy User Service instances available');
  });

  it('forces health check without marking instances unhealthy', async () => {
    const discovery = createDiscovery();
    const instances = (discovery as unknown as {
      services: Map<string, Array<{ healthy: boolean }>>;
    }).services.get('userService') || [];

    await discovery.forceHealthCheck();

    instances.forEach(instance => {
      expect(instance.healthy).toBe(true);
    });
  });

  it('stops timers cleanly', () => {
    const discovery = createDiscovery();
    discovery.stop();

    expect(mockLoggerInfo).toHaveBeenCalledWith('Service discovery stopped');
  });
});
