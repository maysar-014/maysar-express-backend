type MockedRegistry = {
  getAllMetrics: jest.Mock;
  getHealthSummary: jest.Mock;
};

const loadMonitoringModule = (registry: MockedRegistry) => {
  jest.resetModules();
  jest.doMock('./circuit-breaker', () => ({
    circuitBreakerRegistry: registry
  }), { virtual: true });
  jest.doMock('v8', () => ({
    getHeapStatistics: () => ({
      heap_size_limit: 100
    })
  }));

  const setIntervalSpy = jest
    .spyOn(global, 'setInterval')
    .mockImplementation((() => ({}) as unknown) as typeof setInterval);

  const module = require('./monitoring') as typeof import('./monitoring');
  return { module, setIntervalSpy };
};

describe('InfrastructureMonitor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('builds health metrics and classifies system status including google maps outage', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn().mockReturnValue([
        {
          name: 'google-maps-api',
          state: 'OPEN' as never,
          failedRequests: 5,
          totalRequests: 20,
          successfulRequests: 15,
          lastSuccessTime: new Date('2026-03-08T10:00:00.000Z'),
          lastFailureTime: new Date('2026-03-08T10:05:00.000Z'),
          consecutiveFailures: 5,
          consecutiveSuccesses: 0
        }
      ]),
      getHealthSummary: jest.fn().mockReturnValue({
        total: 1,
        closed: 0,
        halfOpen: 0,
        unhealthy: 1,
        open: 1
      })
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    const metrics = monitor.getHealthMetrics();

    expect(metrics.overallStatus).toBe('unhealthy');
    expect(metrics.externalAPIs.googleMaps.status).toBe('outage');
    expect(metrics.externalAPIs.googleMaps.errorRate).toBe(25);
    expect(metrics.externalAPIs.googleMaps.lastError).toContain('Circuit breaker opened at');
  });

  it('keeps metrics history bounded by maxHistorySize', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn().mockReturnValue([]),
      getHealthSummary: jest.fn().mockReturnValue({
        total: 0,
        closed: 0,
        halfOpen: 0,
        unhealthy: 0,
        open: 0
      })
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    (monitor as unknown as { maxHistorySize: number }).maxHistorySize = 2;

    monitor.getHealthMetrics();
    monitor.getHealthMetrics();
    monitor.getHealthMetrics();

    const history = (monitor as unknown as { metricsHistory: unknown[] }).metricsHistory;
    expect(history).toHaveLength(2);
  });

  it('creates deduplicated alerts, resolves alerts, and filters unresolved alerts', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn().mockReturnValue([]),
      getHealthSummary: jest.fn().mockReturnValue({
        total: 0,
        closed: 0,
        halfOpen: 0,
        unhealthy: 0,
        open: 0
      })
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    const createAlert = (
      monitor as unknown as {
        createAlert: (data: {
          severity: 'info' | 'warning' | 'error' | 'critical';
          category: 'circuit_breaker' | 'external_api' | 'system_resource' | 'performance';
          message: string;
          details: Record<string, unknown>;
        }) => void;
      }
    ).createAlert.bind(monitor);

    createAlert({
      severity: 'error',
      category: 'external_api',
      message: 'Google Maps API is experiencing outages',
      details: { api: 'googleMaps' }
    });
    createAlert({
      severity: 'error',
      category: 'external_api',
      message: 'Google Maps API is experiencing outages',
      details: { api: 'googleMaps' }
    });

    const alerts = (monitor as unknown as { alerts: Array<{ id: string; resolved: boolean }> }).alerts;
    expect(alerts).toHaveLength(1);
    expect(monitor.getUnresolvedAlerts()).toHaveLength(1);
    expect(monitor.resolveAlert(alerts[0]!.id)).toBe(true);
    expect(monitor.resolveAlert(alerts[0]!.id)).toBe(false);
    expect(monitor.getUnresolvedAlerts()).toHaveLength(0);
  });

  it('performs health checks and emits alerts for breaker/api/memory conditions', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn(),
      getHealthSummary: jest.fn()
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    jest.spyOn(monitor, 'getHealthMetrics').mockReturnValue({
      timestamp: new Date('2026-03-08T10:00:00.000Z'),
      overallStatus: 'degraded',
      circuitBreakers: {
        total: 2,
        healthy: 0,
        degraded: 1,
        unhealthy: 1,
        metrics: [
          {
            name: 'google-maps-api',
            state: 'OPEN' as never,
            failedRequests: 10,
            totalRequests: 20,
            successfulRequests: 10,
            lastFailureTime: new Date('2026-03-08T10:05:00.000Z'),
            lastSuccessTime: new Date('2026-03-08T10:00:00.000Z'),
            consecutiveFailures: 10,
            consecutiveSuccesses: 0
          },
          {
            name: 'weather-api',
            state: 'HALF_OPEN' as never,
            failedRequests: 2,
            totalRequests: 10,
            successfulRequests: 8,
            lastFailureTime: new Date('2026-03-08T09:50:00.000Z'),
            lastSuccessTime: new Date('2026-03-08T09:58:00.000Z'),
            consecutiveFailures: 2,
            consecutiveSuccesses: 2
          }
        ]
      },
      externalAPIs: {
        googleMaps: {
          status: 'outage',
          errorRate: 50,
          lastError: 'outage'
        }
      },
      systemResources: {
        memoryUsage: 95,
        activeConnections: 3
      }
    });

    (
      monitor as unknown as { performHealthChecks: () => void }
    ).performHealthChecks();

    const alerts = monitor.getRecentAlerts(1);
    expect(alerts.some(a => a.category === 'circuit_breaker' && a.message.includes('OPEN'))).toBe(true);
    expect(alerts.some(a => a.category === 'circuit_breaker' && a.message.includes('HALF_OPEN'))).toBe(true);
    expect(alerts.some(a => a.category === 'external_api')).toBe(true);
    expect(alerts.some(a => a.category === 'system_resource' && a.severity === 'critical')).toBe(true);
  });

  it('cleans up old resolved alerts while preserving unresolved alerts', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn().mockReturnValue([]),
      getHealthSummary: jest.fn().mockReturnValue({
        total: 0,
        closed: 0,
        halfOpen: 0,
        unhealthy: 0,
        open: 0
      })
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    const now = Date.now();
    (monitor as unknown as {
      alerts: Array<{
        id: string;
        timestamp: Date;
        severity: 'info' | 'warning' | 'error' | 'critical';
        category: 'circuit_breaker' | 'external_api' | 'system_resource' | 'performance';
        message: string;
        details: Record<string, unknown>;
        resolved: boolean;
        resolvedAt?: Date;
      }>;
    }).alerts = [
      {
        id: 'a1',
        timestamp: new Date(now - 10 * 24 * 60 * 60 * 1000),
        severity: 'warning',
        category: 'system_resource',
        message: 'old unresolved',
        details: {},
        resolved: false
      },
      {
        id: 'a2',
        timestamp: new Date(now - 10 * 24 * 60 * 60 * 1000),
        severity: 'warning',
        category: 'system_resource',
        message: 'old resolved',
        details: {},
        resolved: true,
        resolvedAt: new Date(now - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'a3',
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
        severity: 'warning',
        category: 'system_resource',
        message: 'recent resolved',
        details: {},
        resolved: true,
        resolvedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    (
      monitor as unknown as { cleanupOldAlerts: () => void }
    ).cleanupOldAlerts();

    const remaining = (monitor as unknown as { alerts: Array<{ id: string }> }).alerts;
    expect(remaining.map(a => a.id)).toEqual(['a1', 'a3']);
  });

  it('forces gc at critical memory usage and returns recalculated percentage', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn().mockReturnValue([]),
      getHealthSummary: jest.fn().mockReturnValue({
        total: 0,
        closed: 0,
        halfOpen: 0,
        unhealthy: 0,
        open: 0
      })
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    const gcMock = jest.fn();
    const originalGc = global.gc;
    (globalThis as { gc?: () => void }).gc = gcMock;

    const memSpy = jest
      .spyOn(process, 'memoryUsage')
      .mockReturnValueOnce({
        rss: 98,
        heapTotal: 100,
        heapUsed: 98,
        external: 0,
        arrayBuffers: 0
      } as NodeJS.MemoryUsage)
      .mockReturnValueOnce({
        rss: 40,
        heapTotal: 100,
        heapUsed: 40,
        external: 0,
        arrayBuffers: 0
      } as NodeJS.MemoryUsage);

    const usage = (
      monitor as unknown as { getMemoryUsage: () => number }
    ).getMemoryUsage();

    expect(gcMock).toHaveBeenCalledTimes(1);
    expect(usage).toBe(40);

    memSpy.mockRestore();
    (globalThis as { gc?: () => void }).gc = originalGc;
  });

  it('provides health summary and endpoint helper payloads', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn().mockReturnValue([]),
      getHealthSummary: jest.fn().mockReturnValue({
        total: 0,
        closed: 0,
        halfOpen: 0,
        unhealthy: 0,
        open: 0
      })
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    jest.spyOn(process, 'uptime').mockReturnValue(1234);
    jest.spyOn(monitor, 'getHealthMetrics').mockReturnValue({
      timestamp: new Date('2026-03-08T10:00:00.000Z'),
      overallStatus: 'healthy',
      circuitBreakers: { total: 0, healthy: 0, degraded: 0, unhealthy: 0, metrics: [] },
      externalAPIs: { googleMaps: { status: 'operational', errorRate: 0 } },
      systemResources: { memoryUsage: 10, activeConnections: 0 }
    });

    const summary = monitor.getHealthSummary();
    expect(summary).toEqual({
      status: 'healthy',
      uptime: 1234,
      alerts: { total: 0, unresolved: 0, bySeverity: {} },
      circuitBreakers: { total: 0, healthy: 0, degraded: 0, unhealthy: 0, metrics: [] }
    });

    jest.spyOn(module.infrastructureMonitor, 'getHealthSummary').mockReturnValue(summary);
    jest.spyOn(module.infrastructureMonitor, 'getHealthMetrics').mockReturnValue({
      timestamp: new Date('2026-03-08T10:00:00.000Z'),
      overallStatus: 'healthy',
      circuitBreakers: { total: 0, healthy: 0, degraded: 0, unhealthy: 0, metrics: [] },
      externalAPIs: { googleMaps: { status: 'operational', errorRate: 0 } },
      systemResources: { memoryUsage: 10, activeConnections: 0 }
    });
    jest.spyOn(module.infrastructureMonitor, 'getMetricsHistory').mockReturnValue([]);
    jest.spyOn(module.infrastructureMonitor, 'getRecentAlerts').mockReturnValue([]);

    expect(module.getHealthCheckData()).toEqual(summary);
    expect(module.getDetailedMetrics(2)).toEqual({
      current: expect.objectContaining({ overallStatus: 'healthy' }),
      history: [],
      alerts: []
    });
  });

  it('destroy clears monitor state', () => {
    const registry: MockedRegistry = {
      getAllMetrics: jest.fn().mockReturnValue([]),
      getHealthSummary: jest.fn().mockReturnValue({
        total: 0,
        closed: 0,
        halfOpen: 0,
        unhealthy: 0,
        open: 0
      })
    };

    const { module } = loadMonitoringModule(registry);
    const monitor = new module.InfrastructureMonitor(1000);
    (monitor as unknown as { alerts: unknown[] }).alerts = [{}];
    (monitor as unknown as { metricsHistory: unknown[] }).metricsHistory = [{}];

    monitor.destroy();

    expect((monitor as unknown as { alerts: unknown[] }).alerts).toHaveLength(0);
    expect((monitor as unknown as { metricsHistory: unknown[] }).metricsHistory).toHaveLength(0);
  });
});
