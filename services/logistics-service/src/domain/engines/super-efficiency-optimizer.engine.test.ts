import {
  CacheManager,
  PerformanceMonitor,
  SuperEfficiencyOptimizer
} from './super-efficiency-optimizer.engine';

describe('SuperEfficiencyOptimizer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('implements advanced caching and warms known cache keys', async () => {
    const optimizer = new SuperEfficiencyOptimizer();

    const result = await optimizer.implementAdvancedCaching();

    expect(result.strategy).toBe('hybrid');
    expect(result.ttl).toBe(300000);
    expect(result.performance.responseTime).toBe(25);
    expect(await optimizer.get('courier_performance_metrics')).toEqual(
      expect.objectContaining({ onTimeRate: 94 })
    );
    expect(await optimizer.get('gps_analytics')).toEqual(
      expect.objectContaining({ reliability: 92 })
    );

    optimizer.destroy();
  });

  it('returns query optimization summary payload', async () => {
    const optimizer = new SuperEfficiencyOptimizer();

    const result = await optimizer.optimizeQueryPerformance();

    expect(result.indexesCreated).toHaveLength(4);
    expect(result.optimizedQueries).toBe(24);
    expect(result.performanceGain).toBe(65.3);

    optimizer.destroy();
  });

  it('implements connection pooling with max pool size', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const optimizer = new SuperEfficiencyOptimizer();

    const result = await optimizer.implementConnectionPooling();

    expect(result).toEqual(
      expect.objectContaining({
        poolSize: 20,
        activeConnections: 8,
        connectionTime: 5
      })
    );
    expect((optimizer as unknown as { connectionPool: unknown[] }).connectionPool).toHaveLength(20);
    expect(intervalSpy).toHaveBeenCalledTimes(2);

    optimizer.destroy();
  });

  it('adds predictive preloading and returns optimization stats', async () => {
    const optimizer = new SuperEfficiencyOptimizer();
    jest
      .spyOn(
        optimizer as unknown as { implementPredictiveCache: (patterns: unknown[]) => Promise<void> },
        'implementPredictiveCache'
      )
      .mockResolvedValue(undefined);

    const result = await optimizer.addPredictivePreloading();

    expect(result.preloadedData).toContain('courier_daily_kpis');
    expect(result.cacheHitRate).toBe(92.1);
    expect(result.predictiveAccuracy).toBe(78.4);

    optimizer.destroy();
  });

  it('supports set/get/invalidate and expires stale values', async () => {
    const optimizer = new SuperEfficiencyOptimizer();
    await optimizer.set('courier:1', { ok: true });
    await optimizer.set('courier:2', { ok: false });
    await optimizer.set('expired:key', { stale: true }, -1);

    expect(await optimizer.get('courier:1')).toEqual({ ok: true });
    expect(await optimizer.get('expired:key')).toBeNull();

    await optimizer.invalidate('courier:');
    expect(await optimizer.get('courier:1')).toBeNull();
    expect(await optimizer.get('courier:2')).toBeNull();

    optimizer.destroy();
  });

  it('cleans up expired cache entries and logs bulk cleanup', async () => {
    const optimizer = new SuperEfficiencyOptimizer();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    for (let i = 0; i < 11; i++) {
      await optimizer.set(`expired:${i}`, i, -1);
    }

    (
      optimizer as unknown as { cleanupExpiredCache: () => void }
    ).cleanupExpiredCache();

    expect(logSpy).toHaveBeenCalledWith('Cleaned up 11 expired cache entries');
    expect(await optimizer.get('expired:1')).toBeNull();

    optimizer.destroy();
  });
});

describe('CacheManager', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is a singleton and tracks cache hits/misses/sets', async () => {
    const one = CacheManager.getInstance();
    const two = CacheManager.getInstance();
    one.clear();

    await one.set('a', { value: 1 });
    expect(await one.get('a')).toEqual({ value: 1 });
    expect(await one.get('missing')).toBeNull();

    const stats = one.getStats();
    expect(one).toBe(two);
    expect(stats.sets).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(50);

    one.destroy();
  });

  it('removes expired entries and supports clear/destroy', async () => {
    const manager = CacheManager.getInstance();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    manager.clear();

    await manager.set('expired', { old: true }, -1);
    (
      manager as unknown as { cleanupExpiredEntries: () => void }
    ).cleanupExpiredEntries();
    expect(logSpy).toHaveBeenCalledWith('CacheManager: Cleaned up 1 expired entries');

    manager.clear();
    expect(manager.getStats()).toEqual(
      expect.objectContaining({ hits: 0, misses: 0, sets: 0, size: 0 })
    );

    manager.destroy();
    expect(manager.getStats()).toEqual(
      expect.objectContaining({ hits: 0, misses: 0, sets: 0, size: 0 })
    );
  });
});

describe('PerformanceMonitor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns zero metrics when no samples exist', () => {
    const monitor = new PerformanceMonitor();

    expect(monitor.getAverageMetrics()).toEqual({
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      cpuUsage: 0,
      memoryUsage: 0
    });
  });

  it('builds performance report recommendations for degraded metrics', () => {
    const monitor = new PerformanceMonitor();
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    monitor.recordMetric({
      responseTime: 150,
      throughput: 40,
      errorRate: 2,
      cpuUsage: 90,
      memoryUsage: 91
    });

    const report = monitor.getPerformanceReport();

    expect(report.trend).toBe('stable');
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        'Consider implementing additional caching layers',
        'Scale up CPU resources or optimize algorithms',
        'Implement memory optimization or increase available RAM',
        'Investigate and fix error sources'
      ])
    );
  });

  it('calculates trend branches directly', () => {
    const monitor = new PerformanceMonitor();
    const calculateTrend = (
      monitor as unknown as {
        calculateTrend: (
          current: { responseTime: number; throughput: number; errorRate: number; cpuUsage: number; memoryUsage: number },
          previous: { responseTime: number; throughput: number; errorRate: number; cpuUsage: number; memoryUsage: number }
        ) => 'improving' | 'stable' | 'declining';
      }
    ).calculateTrend.bind(monitor);

    expect(
      calculateTrend(
        { responseTime: 80, throughput: 120, errorRate: 0, cpuUsage: 0, memoryUsage: 0 },
        { responseTime: 100, throughput: 100, errorRate: 0, cpuUsage: 0, memoryUsage: 0 }
      )
    ).toBe('improving');
    expect(
      calculateTrend(
        { responseTime: 120, throughput: 80, errorRate: 0, cpuUsage: 0, memoryUsage: 0 },
        { responseTime: 100, throughput: 100, errorRate: 0, cpuUsage: 0, memoryUsage: 0 }
      )
    ).toBe('declining');
    expect(
      calculateTrend(
        { responseTime: 102, throughput: 99, errorRate: 0, cpuUsage: 0, memoryUsage: 0 },
        { responseTime: 100, throughput: 100, errorRate: 0, cpuUsage: 0, memoryUsage: 0 }
      )
    ).toBe('stable');
  });
});
