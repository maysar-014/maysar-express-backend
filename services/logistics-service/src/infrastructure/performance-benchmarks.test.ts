import {
  PerformanceBenchmarkEngine,
  performanceBenchmarkEngine
} from './performance-benchmarks';

describe('PerformanceBenchmarkEngine', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('benchmarks an operation and stores averaged successful metrics', async () => {
    const engine = new PerformanceBenchmarkEngine();
    (engine as unknown as { warmupIterations: number }).warmupIterations = 0;
    (engine as unknown as { measurementIterations: number }).measurementIterations = 3;

    await (
      engine as unknown as {
        benchmarkOperation: (
          name: string,
          category: 'database' | 'external_api' | 'business_logic' | 'saga' | 'serialization',
          operation: () => Promise<void>,
          metadata?: Record<string, unknown>
        ) => Promise<void>;
      }
    ).benchmarkOperation('op-success', 'business_logic', async () => undefined, {
      test: true
    });

    const [result] = engine.getResults();
    expect(result?.operation).toBe('op-success');
    expect(result?.success).toBe(true);
    expect(result?.metadata).toEqual(
      expect.objectContaining({
        test: true,
        sampleSize: 3
      })
    );
    expect(typeof result?.duration).toBe('number');
  });

  it('stores failed benchmark result when all iterations fail', async () => {
    const engine = new PerformanceBenchmarkEngine();
    (engine as unknown as { warmupIterations: number }).warmupIterations = 0;
    (engine as unknown as { measurementIterations: number }).measurementIterations = 2;

    await (
      engine as unknown as {
        benchmarkOperation: (
          name: string,
          category: 'database' | 'external_api' | 'business_logic' | 'saga' | 'serialization',
          operation: () => Promise<void>
        ) => Promise<void>;
      }
    ).benchmarkOperation('op-fail', 'database', async () => {
      throw new Error('db down');
    });

    expect(engine.getResults()).toEqual([
      expect.objectContaining({
        operation: 'op-fail',
        success: false,
        error: 'All benchmark iterations failed'
      })
    ]);
  });

  it('runs load test with mixed success and failure outcomes', async () => {
    const engine = new PerformanceBenchmarkEngine();
    let index = 0;

    const result = await engine.runLoadTest(
      async () => {
        index += 1;
        if (index % 3 === 0) {
          throw new Error('transient');
        }
      },
      'mixed-load',
      4,
      12
    );

    expect(result.operation).toBe('mixed-load');
    expect(result.totalRequests).toBe(12);
    expect(result.metrics.errorRate).toBeCloseTo(33.33, 1);
    expect(result.metrics.p95ResponseTime).toBeGreaterThanOrEqual(0);
    expect(result.metrics.p99ResponseTime).toBeGreaterThanOrEqual(result.metrics.p95ResponseTime);
  });

  it('runs full benchmark suite with mocked phases and returns summary', async () => {
    const engine = new PerformanceBenchmarkEngine();
    (
      engine as unknown as {
        results: Array<{
          operation: string;
          category: 'database' | 'external_api' | 'business_logic' | 'saga' | 'serialization';
          duration: number;
          memoryDelta: number;
          success: boolean;
        }>;
      }
    ).results = [
      { operation: 'a', category: 'database', duration: 10, memoryDelta: 100, success: true },
      { operation: 'b', category: 'saga', duration: 20, memoryDelta: 200, success: true }
    ];

    const dbSpy = jest
      .spyOn(
        engine as unknown as { benchmarkDatabaseOperations: () => Promise<void> },
        'benchmarkDatabaseOperations'
      )
      .mockResolvedValue(undefined);
    const apiSpy = jest
      .spyOn(
        engine as unknown as { benchmarkExternalAPIs: () => Promise<void> },
        'benchmarkExternalAPIs'
      )
      .mockResolvedValue(undefined);
    const bizSpy = jest
      .spyOn(
        engine as unknown as { benchmarkBusinessLogic: () => Promise<void> },
        'benchmarkBusinessLogic'
      )
      .mockResolvedValue(undefined);
    const sagaSpy = jest
      .spyOn(
        engine as unknown as { benchmarkSagaOperations: () => Promise<void> },
        'benchmarkSagaOperations'
      )
      .mockResolvedValue(undefined);
    const serSpy = jest
      .spyOn(
        engine as unknown as { benchmarkSerialization: () => Promise<void> },
        'benchmarkSerialization'
      )
      .mockResolvedValue(undefined);

    const output = await engine.runFullBenchmarkSuite();

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(apiSpy).toHaveBeenCalledTimes(1);
    expect(bizSpy).toHaveBeenCalledTimes(1);
    expect(sagaSpy).toHaveBeenCalledTimes(1);
    expect(serSpy).toHaveBeenCalledTimes(1);
    expect(output.summary).toEqual({
      totalOperations: 2,
      averageDuration: 15,
      successRate: 100,
      memoryEfficiency: 150
    });
  });

  it('benchmarks serialization stage by delegating two operations', async () => {
    const engine = new PerformanceBenchmarkEngine();
    const benchSpy = jest
      .spyOn(
        engine as unknown as {
          benchmarkOperation: (
            name: string,
            category: 'database' | 'external_api' | 'business_logic' | 'saga' | 'serialization',
            operation: () => Promise<unknown>,
            metadata?: Record<string, unknown>
          ) => Promise<void>;
        },
        'benchmarkOperation'
      )
      .mockResolvedValue(undefined);

    await (
      engine as unknown as { benchmarkSerialization: () => Promise<void> }
    ).benchmarkSerialization();

    expect(benchSpy).toHaveBeenCalledTimes(2);
    expect(benchSpy).toHaveBeenCalledWith(
      'JSON Serialization - Large Object',
      'serialization',
      expect.any(Function),
      expect.objectContaining({ format: 'json' })
    );
    expect(benchSpy).toHaveBeenCalledWith(
      'JSON Deserialization - Large Object',
      'serialization',
      expect.any(Function),
      expect.objectContaining({ operation: 'deserialize' })
    );
  });

  it('computes percentile values including interpolation and empty input', () => {
    const engine = new PerformanceBenchmarkEngine();
    const percentile = (
      engine as unknown as {
        calculatePercentile: (values: number[], p: number) => number;
      }
    ).calculatePercentile.bind(engine);

    expect(percentile([], 95)).toBe(0);
    expect(percentile([10, 20, 30, 40], 50)).toBe(25);
    expect(percentile([1, 2, 3, 4, 5], 95)).toBeCloseTo(4.8, 5);
  });

  it('identifies bottlenecks and recommendations from stressed metrics', () => {
    const engine = new PerformanceBenchmarkEngine();
    const metrics = {
      averageResponseTime: 700,
      p95ResponseTime: 1200,
      p99ResponseTime: 2000,
      throughput: 5,
      errorRate: 9,
      memoryUsage: 150 * 1024 * 1024
    };

    const bottlenecks = (
      engine as unknown as {
        identifyBottlenecks: (m: typeof metrics) => string[];
      }
    ).identifyBottlenecks(metrics);
    const recommendations = (
      engine as unknown as {
        generateRecommendations: (m: typeof metrics) => string[];
      }
    ).generateRecommendations(metrics);

    expect(bottlenecks).toEqual([
      'High latency detected (>1s P95)',
      'High error rate detected (>5%)',
      'Low throughput detected (<10 req/sec)',
      'High memory usage detected (>100MB)'
    ]);
    expect(recommendations).toEqual([
      'Consider optimizing database queries or adding caching',
      'Investigate and fix error sources to improve reliability',
      'Consider horizontal scaling or performance optimizations',
      'Monitor for memory leaks and optimize memory usage'
    ]);
  });

  it('filters results by category and clears results', () => {
    const engine = new PerformanceBenchmarkEngine();
    (
      engine as unknown as {
        results: Array<{
          operation: string;
          category: 'database' | 'external_api' | 'business_logic' | 'saga' | 'serialization';
          duration: number;
          memoryDelta: number;
          success: boolean;
        }>;
      }
    ).results = [
      { operation: 'db', category: 'database', duration: 1, memoryDelta: 1, success: true },
      { operation: 'api', category: 'external_api', duration: 2, memoryDelta: 2, success: true }
    ];

    expect(engine.getResultsByCategory('database')).toHaveLength(1);
    expect(engine.getResults()).toHaveLength(2);
    engine.clearResults();
    expect(engine.getResults()).toHaveLength(0);
  });

  it('exports a global engine instance', () => {
    expect(performanceBenchmarkEngine).toBeInstanceOf(PerformanceBenchmarkEngine);
  });
});
