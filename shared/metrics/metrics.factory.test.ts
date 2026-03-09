export {};

const collectDefaultMetricsMock = jest.fn();
const metricsRegistryMetricsMock = jest.fn(async () => 'metrics-output');
const metricsRegistryClearMock = jest.fn();

class MockRegistry {
  metrics = (...args: any[]) => metricsRegistryMetricsMock.apply(null, args);
  clear = (...args: any[]) => metricsRegistryClearMock.apply(null, args);
}

class MockCounter {
  inc = jest.fn();
  labels = jest.fn(() => ({ inc: jest.fn() }));
  constructor(_config: any) {}
}

class MockGauge {
  set = jest.fn();
  inc = jest.fn();
  dec = jest.fn();
  labels = jest.fn(() => ({ set: jest.fn(), inc: jest.fn(), dec: jest.fn() }));
  constructor(_config: any) {}
}

class MockHistogram {
  observe = jest.fn();
  labels = jest.fn(() => ({ observe: jest.fn() }));
  constructor(_config: any) {}
}

jest.mock('prom-client', () => ({
  Registry: MockRegistry,
  collectDefaultMetrics: (...args: any[]) => collectDefaultMetricsMock(...args),
  Gauge: MockGauge,
  Counter: MockCounter,
  Histogram: MockHistogram
}));

import { createMetricsCollector, createServiceMetrics, MetricsCollector, metricsRegistry } from './metrics.factory';

describe('metrics.factory', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (MetricsCollector as unknown as { instance?: MetricsCollector }).instance = undefined;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates service metrics with normalized prefix and enables default metrics', () => {
    const metrics = createServiceMetrics('order-service');

    expect(collectDefaultMetricsMock).toHaveBeenCalledWith({
      prefix: 'order_service_',
      register: metricsRegistry
    });
    expect(metrics).toEqual(
      expect.objectContaining({
        httpRequestsTotal: expect.any(MockCounter),
        httpRequestDuration: expect.any(MockHistogram),
        memoryUsage: expect.any(MockGauge),
        healthCheckDuration: expect.any(MockHistogram)
      })
    );
  });

  it('requires metrics for first MetricsCollector initialization', () => {
    expect(() => MetricsCollector.getInstance('svc')).toThrow('Metrics must be provided for the first initialization');
  });

  it('collects and records runtime metrics when enabled', async () => {
    process.env.METRICS_ENABLED = 'true';
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue({} as any);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => undefined as any);
    const setImmediateSpy = jest.spyOn(global, 'setImmediate').mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });
    const memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100,
      heapUsed: 50,
      heapTotal: 200,
      external: 10,
      arrayBuffers: 0
    } as NodeJS.MemoryUsage);

    const metrics = createServiceMetrics('catalog-service');
    const collector = MetricsCollector.getInstance('catalog-service', metrics);
    (collector as any).collectSystemMetrics();

    expect(setIntervalSpy).toHaveBeenCalled();
    expect((metrics.memoryUsage.set as jest.Mock).mock.calls).toEqual(
      expect.arrayContaining([
        [{ type: 'rss' }, 100],
        [{ type: 'heapUsed' }, 50],
        [{ type: 'heapTotal' }, 200],
        [{ type: 'external' }, 10]
      ])
    );
    expect(metrics.eventLoopLag.set).toHaveBeenCalled();

    collector.destroy();
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(setImmediateSpy).toHaveBeenCalled();
    memoryUsageSpy.mockRestore();
  });

  it('records domain-specific counters/histograms and updates gauges', async () => {
    const metrics = createServiceMetrics('payment-service');
    const collector = createMetricsCollector('payment-service', metrics);

    collector.recordHttpRequest('GET', '/orders', 200, 120);
    collector.recordDatabaseQuery('select', 'orders', 30, true);
    collector.recordDatabaseQuery('insert', 'orders', 10, false, 'timeout');
    collector.updateDatabaseConnections('primary', 7);
    collector.recordExternalRequest('maps', 'route', false, 250);
    collector.recordError('TimeoutError', 'HIGH', 'checkout');
    collector.updateCircuitBreakerState('maps-breaker', 'half_open');
    collector.recordCircuitBreakerRequest('maps-breaker', 'HALF_OPEN');
    collector.recordRetry('fetch-routes', 2, false);
    collector.recordRateLimitHit('/orders', '127.0.0.1');
    collector.recordAuthAttempt(true);
    collector.recordHealthCheck('database', true, 20);

    expect(metrics.httpRequestsTotal.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/orders',
      status_code: '200'
    });
    expect(metrics.databaseQueryDuration.observe).toHaveBeenCalledWith({ operation: 'select', table: 'orders' }, 0.03);
    expect(metrics.databaseErrorsTotal.inc).toHaveBeenCalledWith({
      operation: 'insert',
      table: 'orders',
      error_type: 'timeout'
    });
    expect(metrics.databaseConnectionsTotal.set).toHaveBeenCalledWith({ type: 'primary' }, 7);
    expect(metrics.externalRequestsTotal.inc).toHaveBeenCalledWith({
      service: 'maps',
      operation: 'route',
      status: 'error'
    });
    expect(metrics.errorsTotal.inc).toHaveBeenCalledWith({
      type: 'TimeoutError',
      severity: 'HIGH',
      component: 'checkout'
    });
    expect(metrics.circuitBreakerState.set).toHaveBeenCalledWith({ name: 'maps-breaker' }, 2);
    expect(metrics.circuitBreakerRequestsTotal.inc).toHaveBeenCalledWith({ name: 'maps-breaker', state: 'HALF_OPEN' });
    expect(metrics.retriesTotal.inc).toHaveBeenCalledWith({
      operation: 'fetch-routes',
      attempt: '2',
      success: 'false'
    });
    expect(metrics.rateLimitHitsTotal.inc).toHaveBeenCalledWith({ endpoint: '/orders', ip: '127.0.0.1' });
    expect(metrics.authAttemptsTotal.inc).toHaveBeenCalledWith({ result: 'success' });
    expect(metrics.healthCheckStatus.set).toHaveBeenCalledWith({ check: 'database' }, 1);
  });

  it('exposes registry metrics and reset behavior', async () => {
    const metrics = createServiceMetrics('auth-service');
    const collector = createMetricsCollector('auth-service', metrics);

    const output = await collector.getMetrics();
    collector.reset();

    expect(output).toBe('metrics-output');
    expect(metricsRegistryMetricsMock).toHaveBeenCalled();
    expect(metricsRegistryClearMock).toHaveBeenCalled();
  });
});
