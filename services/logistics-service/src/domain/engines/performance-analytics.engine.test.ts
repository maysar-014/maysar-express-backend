import {
  PerformanceAnalyticsEngine,
  TrendAnalysisEngine
} from './performance-analytics.engine';

describe('PerformanceAnalyticsEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates KPIs from delivery, route, earnings, and safety metrics', async () => {
    const engine = new PerformanceAnalyticsEngine();
    jest
      .spyOn(engine as any, 'getDeliveryMetrics')
      .mockResolvedValue({ onTimeRate: 94, satisfactionScore: 5 });
    jest
      .spyOn(engine as any, 'getRouteMetrics')
      .mockResolvedValue({ efficiencyScore: 82 });
    jest
      .spyOn(engine as any, 'getEarningsMetrics')
      .mockResolvedValue({ hourlyRate: 6400 });
    jest
      .spyOn(engine as any, 'getSafetyMetrics')
      .mockResolvedValue({ safetyScore: 97 });

    const result = await engine.calculateKPIs('courier-1');

    expect(result).toEqual({
      onTimeDeliveryRate: 94,
      customerSatisfactionScore: 5,
      routeEfficiencyScore: 82,
      earningsPerHour: 6400,
      safetyScore: 97
    });
  });

  it('generates warnings/improvements and suggestions for low KPI values', async () => {
    const engine = new PerformanceAnalyticsEngine();
    jest.spyOn(engine, 'calculateKPIs').mockResolvedValue({
      onTimeDeliveryRate: 72,
      customerSatisfactionScore: 4,
      routeEfficiencyScore: 65,
      earningsPerHour: 4300,
      safetyScore: 90
    });

    const insights = await engine.generatePerformanceInsights('courier-2');
    const suggestions = await engine.suggestImprovements('courier-2');

    expect(insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'warning',
          title: 'On-Time Performance Needs Attention',
          actionRequired: true
        }),
        expect.objectContaining({
          type: 'improvement',
          title: 'Route Optimization Opportunity'
        })
      ])
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'efficiency', priority: 'high' }),
        expect.objectContaining({ category: 'earnings', priority: 'medium' })
      ])
    );
  });

  it('creates benchmark comparisons with percentile and comparison labels', async () => {
    const engine = new PerformanceAnalyticsEngine();
    jest.spyOn(engine, 'calculateKPIs').mockResolvedValue({
      onTimeDeliveryRate: 97,
      customerSatisfactionScore: 5,
      routeEfficiencyScore: 60,
      earningsPerHour: 7000,
      safetyScore: 95
    });

    const result = await engine.createBenchmarkComparisons('courier-3');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        metric: 'On-Time Delivery Rate',
        comparison: 'above_average'
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        metric: 'Route Efficiency',
        comparison: 'below_average'
      })
    );
  });
});

describe('TrendAnalysisEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns trend analysis and performance predictions', async () => {
    const trendEngine = new TrendAnalysisEngine();
    jest
      .spyOn(PerformanceAnalyticsEngine.prototype, 'calculateKPIs')
      .mockResolvedValue({
        onTimeDeliveryRate: 88,
        customerSatisfactionScore: 4,
        routeEfficiencyScore: 79,
        earningsPerHour: 5600,
        safetyScore: 93
      });

    const trends = await trendEngine.analyzePerformanceTrends('courier-4');
    const predictions = await trendEngine.predictFuturePerformance('courier-4');

    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]).toEqual(
      expect.objectContaining({
        metric: 'On-Time Delivery Rate',
        trend: 'improving'
      })
    );
    expect(predictions[0]).toEqual(
      expect.objectContaining({
        metric: 'On-Time Delivery Rate',
        currentValue: 88,
        predictedValue: 91
      })
    );
  });

  it('generates a full performance report', async () => {
    const trendEngine = new TrendAnalysisEngine();
    jest
      .spyOn(PerformanceAnalyticsEngine.prototype, 'calculateKPIs')
      .mockResolvedValue({
        onTimeDeliveryRate: 90,
        customerSatisfactionScore: 4,
        routeEfficiencyScore: 80,
        earningsPerHour: 6000,
        safetyScore: 94
      });

    const report = await trendEngine.generatePerformanceReport('courier-5');

    expect(report.reportId).toMatch(/^perf_/);
    expect(report.courierId).toBe('courier-5');
    expect(report.kpis.onTimeDeliveryRate).toBe(90);
    expect(report.generatedAt).toBeInstanceOf(Date);
  });
});
