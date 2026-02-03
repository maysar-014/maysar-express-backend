export interface CourierKPIs {
  onTimeDeliveryRate: number;
  customerSatisfactionScore: number;
  routeEfficiencyScore: number;
  earningsPerHour: number;
  safetyScore: number;
}

export interface Insight {
  type: 'improvement' | 'warning' | 'achievement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

export interface Benchmark {
  metric: string;
  courierValue: number;
  averageValue: number;
  topPerformerValue: number;
  percentile: number;
  comparison: 'above_average' | 'average' | 'below_average';
}

export interface Suggestion {
  category: 'efficiency' | 'earnings' | 'safety' | 'customer_service';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: 'easy' | 'moderate' | 'complex';
}

export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changePercentage: number;
  timeframe: string;
  recommendations: string[];
}

export interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  factors: string[];
}

export interface PerformanceReport {
  reportId: string;
  courierId: string;
  period: string;
  kpis: CourierKPIs;
  trends: PerformanceTrend[];
  insights: Insight[];
  recommendations: Suggestion[];
  generatedAt: Date;
}

export class PerformanceAnalyticsEngine {
  private readonly ACCURACY_TARGET = 92.0;

  async calculateKPIs(courierId: string): Promise<CourierKPIs> {
    const [deliveryData, routeData, earningsData, safetyData] = await Promise.all([
      this.getDeliveryMetrics(courierId),
      this.getRouteMetrics(courierId),
      this.getEarningsMetrics(courierId),
      this.getSafetyMetrics(courierId)
    ]);

    return {
      onTimeDeliveryRate: deliveryData.onTimeRate,
      customerSatisfactionScore: deliveryData.satisfactionScore,
      routeEfficiencyScore: routeData.efficiencyScore,
      earningsPerHour: earningsData.hourlyRate,
      safetyScore: safetyData.safetyScore
    };
  }

  async generatePerformanceInsights(courierId: string): Promise<Insight[]> {
    const kpis = await this.calculateKPIs(courierId);
    const insights: Insight[] = [];

    if (kpis.onTimeDeliveryRate > 95) {
      insights.push({
        type: 'achievement',
        title: 'Excellent On-Time Performance',
        description: `${kpis.onTimeDeliveryRate}% on-time delivery rate exceeds expectations`,
        impact: 'high',
        actionRequired: false
      });
    } else if (kpis.onTimeDeliveryRate < 80) {
      insights.push({
        type: 'warning',
        title: 'On-Time Performance Needs Attention',
        description: `${kpis.onTimeDeliveryRate}% on-time rate is below target`,
        impact: 'high',
        actionRequired: true
      });
    }

    if (kpis.routeEfficiencyScore < 70) {
      insights.push({
        type: 'improvement',
        title: 'Route Optimization Opportunity',
        description: 'Route efficiency can be improved through better planning',
        impact: 'medium',
        actionRequired: true
      });
    }

    return insights;
  }

  async createBenchmarkComparisons(courierId: string): Promise<Benchmark[]> {
    const kpis = await this.calculateKPIs(courierId);
    const benchmarks: Benchmark[] = [];

    benchmarks.push({
      metric: 'On-Time Delivery Rate',
      courierValue: kpis.onTimeDeliveryRate,
      averageValue: 87.5,
      topPerformerValue: 96.2,
      percentile: this.calculatePercentile(kpis.onTimeDeliveryRate, 87.5),
      comparison: this.getComparison(kpis.onTimeDeliveryRate, 87.5)
    });

    benchmarks.push({
      metric: 'Route Efficiency',
      courierValue: kpis.routeEfficiencyScore,
      averageValue: 78.3,
      topPerformerValue: 92.1,
      percentile: this.calculatePercentile(kpis.routeEfficiencyScore, 78.3),
      comparison: this.getComparison(kpis.routeEfficiencyScore, 78.3)
    });

    return benchmarks;
  }

  async suggestImprovements(courierId: string): Promise<Suggestion[]> {
    const kpis = await this.calculateKPIs(courierId);
    const suggestions: Suggestion[] = [];

    if (kpis.routeEfficiencyScore < 80) {
      suggestions.push({
        category: 'efficiency',
        priority: 'high',
        title: 'Optimize Route Planning',
        description: 'Use advanced route optimization to reduce travel time',
        expectedImpact: '15-20% efficiency improvement',
        implementationEffort: 'easy'
      });
    }

    if (kpis.earningsPerHour < 5000) {
      suggestions.push({
        category: 'earnings',
        priority: 'medium',
        title: 'Focus on High-Value Deliveries',
        description: 'Prioritize deliveries with higher commission rates',
        expectedImpact: '10-15% earnings increase',
        implementationEffort: 'moderate'
      });
    }

    return suggestions;
  }

  private async getDeliveryMetrics(courierId: string) {
    return {
      onTimeRate: Math.round(85 + Math.random() * 15),
      satisfactionScore: Math.round(4.2 + Math.random() * 0.8)
    };
  }

  private async getRouteMetrics(courierId: string) {
    return {
      efficiencyScore: Math.round(75 + Math.random() * 20)
    };
  }

  private async getEarningsMetrics(courierId: string) {
    return {
      hourlyRate: Math.round(4500 + Math.random() * 2000)
    };
  }

  private async getSafetyMetrics(courierId: string) {
    return {
      safetyScore: Math.round(88 + Math.random() * 12)
    };
  }

  private calculatePercentile(value: number, average: number): number {
    return Math.round((value / average) * 50 + 25);
  }

  private getComparison(value: number, average: number): 'above_average' | 'average' | 'below_average' {
    if (value > average * 1.1) return 'above_average';
    if (value < average * 0.9) return 'below_average';
    return 'average';
  }
}

export class TrendAnalysisEngine {
  async analyzePerformanceTrends(courierId: string): Promise<PerformanceTrend[]> {
    const historicalData = await this.getHistoricalPerformance(courierId);
    const trends: PerformanceTrend[] = [];

    trends.push({
      metric: 'On-Time Delivery Rate',
      trend: 'improving',
      changePercentage: 5.2,
      timeframe: 'last_30_days',
      recommendations: ['Continue current practices', 'Focus on maintaining consistency']
    });

    trends.push({
      metric: 'Route Efficiency',
      trend: 'stable',
      changePercentage: 1.1,
      timeframe: 'last_30_days',
      recommendations: ['Consider route optimization tools', 'Analyze traffic patterns']
    });

    return trends;
  }

  async predictFuturePerformance(courierId: string): Promise<Prediction[]> {
    const currentKPIs = await new PerformanceAnalyticsEngine().calculateKPIs(courierId);
    const predictions: Prediction[] = [];

    predictions.push({
      metric: 'On-Time Delivery Rate',
      currentValue: currentKPIs.onTimeDeliveryRate,
      predictedValue: Math.min(100, currentKPIs.onTimeDeliveryRate + 3),
      confidence: 78,
      timeframe: 'next_30_days',
      factors: ['Historical trend', 'Seasonal patterns', 'Route optimization']
    });

    return predictions;
  }

  async generatePerformanceReport(courierId: string): Promise<PerformanceReport> {
    const analyticsEngine = new PerformanceAnalyticsEngine();
    const [kpis, trends, insights, recommendations] = await Promise.all([
      analyticsEngine.calculateKPIs(courierId),
      this.analyzePerformanceTrends(courierId),
      analyticsEngine.generatePerformanceInsights(courierId),
      analyticsEngine.suggestImprovements(courierId)
    ]);

    return {
      reportId: `perf_${Date.now()}`,
      courierId,
      period: 'last_30_days',
      kpis,
      trends,
      insights,
      recommendations,
      generatedAt: new Date()
    };
  }

  private async getHistoricalPerformance(courierId: string) {
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      onTimeRate: 85 + Math.random() * 15,
      efficiency: 75 + Math.random() * 20
    }));
  }
}