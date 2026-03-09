import { PerformanceMonitoringEngine } from './performance-monitoring.engine';

describe('PerformanceMonitoringEngine', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculatePerformanceMetrics returns expected static metrics and logs timing', async () => {
    const engine = new PerformanceMonitoringEngine();
    const metrics = await engine.calculatePerformanceMetrics('cour-1');

    expect(metrics).toEqual({
      onTimeDelivery: 94.2,
      acceptanceRate: 87.5,
      customerSatisfaction: 4.6,
      routeEfficiency: 89.3,
      fuelConsumption: 12.4,
      averageDeliveryTime: 28.5,
      completionRate: 96.8
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Performance metrics calculated for cour-1 in'));
  });

  it('calculatePerformanceMetrics wraps internal failures', async () => {
    logSpy.mockImplementationOnce(() => {
      throw new Error('logger write failed');
    });

    const engine = new PerformanceMonitoringEngine();
    await expect(engine.calculatePerformanceMetrics('cour-2')).rejects.toThrow(
      'Failed to calculate performance metrics: Error: logger write failed'
    );
  });

  it('generatePerformanceInsights creates warning/improvement/achievement insights', async () => {
    const engine = new PerformanceMonitoringEngine();
    jest.spyOn(engine, 'calculatePerformanceMetrics').mockResolvedValueOnce({
      onTimeDelivery: 88,
      acceptanceRate: 87,
      customerSatisfaction: 3.7,
      routeEfficiency: 80,
      fuelConsumption: 13,
      averageDeliveryTime: 32,
      completionRate: 94
    });

    const low = await engine.generatePerformanceInsights('cour-low');
    expect(low).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: 'onTimeDelivery', type: 'warning' }),
        expect.objectContaining({ metric: 'customerSatisfaction', type: 'warning' }),
        expect.objectContaining({ metric: 'routeEfficiency', type: 'improvement' })
      ])
    );

    jest.spyOn(engine, 'calculatePerformanceMetrics').mockResolvedValueOnce({
      onTimeDelivery: 96,
      acceptanceRate: 90,
      customerSatisfaction: 4.8,
      routeEfficiency: 92,
      fuelConsumption: 10,
      averageDeliveryTime: 25,
      completionRate: 98
    });
    const high = await engine.generatePerformanceInsights('cour-high');
    expect(high).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'onTimeDelivery',
          type: 'achievement',
          actionable: false
        })
      ])
    );
  });

  it('getBenchmarkComparisons and overview reflect calculated metrics', async () => {
    const engine = new PerformanceMonitoringEngine();
    jest.spyOn(engine, 'calculatePerformanceMetrics').mockResolvedValue({
      onTimeDelivery: 95,
      acceptanceRate: 90,
      customerSatisfaction: 4.5,
      routeEfficiency: 90,
      fuelConsumption: 11,
      averageDeliveryTime: 27,
      completionRate: 97
    });

    const benchmarks = await engine.getBenchmarkComparisons('cour-1');
    expect(benchmarks).toHaveLength(3);
    expect(benchmarks[0]).toEqual(expect.objectContaining({ metric: 'onTimeDelivery', courierValue: 95 }));

    const overview = await engine.getPerformanceOverview('cour-1');
    expect(overview).toEqual(
      expect.objectContaining({
        onTimeDelivery: expect.objectContaining({ level: 'Excellent', percentage: 95 }),
        acceptanceConsistency: expect.objectContaining({ level: 'Excellent' }),
        customerSatisfaction: expect.objectContaining({ level: 'Excellent', percentage: 90 }),
        routeEfficiency: expect.objectContaining({ level: 'Excellent' })
      })
    );
  });

  it('getPerformanceHints filters actionable recommendations only', async () => {
    const engine = new PerformanceMonitoringEngine();
    jest.spyOn(engine, 'generatePerformanceInsights').mockResolvedValue([
      {
        type: 'warning',
        metric: 'onTimeDelivery',
        message: 'below target',
        impact: 'high',
        actionable: true,
        recommendation: 'Improve routing'
      },
      {
        type: 'achievement',
        metric: 'customerSatisfaction',
        message: 'great',
        impact: 'medium',
        actionable: false
      },
      {
        type: 'improvement',
        metric: 'routeEfficiency',
        message: 'can improve',
        impact: 'medium',
        actionable: true
      } as any
    ]);

    const hints = await engine.getPerformanceHints('cour-1');

    expect(hints).toEqual([
      {
        metric: 'onTimeDelivery',
        hint: 'Improve routing',
        action: 'below target',
        priority: 'high'
      }
    ]);
  });
});
