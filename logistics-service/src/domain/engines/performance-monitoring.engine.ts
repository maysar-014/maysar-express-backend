export interface PerformanceMetrics {
  onTimeDelivery: number;
  acceptanceRate: number;
  customerSatisfaction: number;
  routeEfficiency: number;
  fuelConsumption: number;
  averageDeliveryTime: number;
  completionRate: number;
}

export interface Insight {
  type: 'improvement' | 'warning' | 'achievement';
  metric: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation?: string;
}

export interface Benchmark {
  metric: string;
  courierValue: number;
  averageValue: number;
  topPerformerValue: number;
  percentile: number;
  trend: 'improving' | 'declining' | 'stable';
}

export class PerformanceMonitoringEngine {
  private readonly ACCURACY_TARGET = 95.0;
  private readonly MAX_PROCESSING_TIME = 12; // ms

  async calculatePerformanceMetrics(courierId: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    try {
      // Simulate performance calculation
      const metrics: PerformanceMetrics = {
        onTimeDelivery: 94.2,
        acceptanceRate: 87.5,
        customerSatisfaction: 4.6,
        routeEfficiency: 89.3,
        fuelConsumption: 12.4, // L/100km
        averageDeliveryTime: 28.5, // minutes
        completionRate: 96.8
      };

      const processingTime = Date.now() - startTime;
      console.log(`Performance metrics calculated for ${courierId} in ${processingTime}ms`);
      
      return metrics;
    } catch (error) {
      throw new Error(`Failed to calculate performance metrics: ${error}`);
    }
  }

  async generatePerformanceInsights(courierId: string): Promise<Insight[]> {
    const metrics = await this.calculatePerformanceMetrics(courierId);
    const insights: Insight[] = [];

    // On-time delivery insights
    if (metrics.onTimeDelivery < 90) {
      insights.push({
        type: 'warning',
        metric: 'onTimeDelivery',
        message: 'On-time delivery rate below target',
        impact: 'high',
        actionable: true,
        recommendation: 'Review route planning and time management'
      });
    } else if (metrics.onTimeDelivery > 95) {
      insights.push({
        type: 'achievement',
        metric: 'onTimeDelivery',
        message: 'Excellent on-time delivery performance',
        impact: 'high',
        actionable: false
      });
    }

    // Customer satisfaction insights
    if (metrics.customerSatisfaction < 4.0) {
      insights.push({
        type: 'warning',
        metric: 'customerSatisfaction',
        message: 'Customer satisfaction below expectations',
        impact: 'high',
        actionable: true,
        recommendation: 'Focus on communication and delivery quality'
      });
    }

    // Route efficiency insights
    if (metrics.routeEfficiency < 85) {
      insights.push({
        type: 'improvement',
        metric: 'routeEfficiency',
        message: 'Route efficiency can be improved',
        impact: 'medium',
        actionable: true,
        recommendation: 'Use route optimization features more effectively'
      });
    }

    return insights;
  }

  async getBenchmarkComparisons(courierId: string): Promise<Benchmark[]> {
    const metrics = await this.calculatePerformanceMetrics(courierId);
    
    return [
      {
        metric: 'onTimeDelivery',
        courierValue: metrics.onTimeDelivery,
        averageValue: 91.5,
        topPerformerValue: 97.8,
        percentile: 72,
        trend: 'improving'
      },
      {
        metric: 'customerSatisfaction',
        courierValue: metrics.customerSatisfaction,
        averageValue: 4.3,
        topPerformerValue: 4.9,
        percentile: 68,
        trend: 'stable'
      },
      {
        metric: 'routeEfficiency',
        courierValue: metrics.routeEfficiency,
        averageValue: 86.2,
        topPerformerValue: 94.1,
        percentile: 65,
        trend: 'improving'
      }
    ];
  }

  async getPerformanceOverview(courierId: string): Promise<any> {
    const metrics = await this.calculatePerformanceMetrics(courierId);
    
    return {
      onTimeDelivery: {
        level: metrics.onTimeDelivery >= 95 ? 'Excellent' : metrics.onTimeDelivery >= 90 ? 'Good' : 'Needs Work',
        trend: 'stable',
        percentage: metrics.onTimeDelivery
      },
      acceptanceConsistency: {
        level: metrics.acceptanceRate >= 90 ? 'Excellent' : metrics.acceptanceRate >= 80 ? 'Good' : 'Needs Work',
        trend: 'improving',
        percentage: metrics.acceptanceRate
      },
      customerSatisfaction: {
        level: metrics.customerSatisfaction >= 4.5 ? 'Excellent' : metrics.customerSatisfaction >= 4.0 ? 'Good' : 'Needs Work',
        trend: 'stable',
        percentage: (metrics.customerSatisfaction / 5) * 100
      },
      routeEfficiency: {
        level: metrics.routeEfficiency >= 90 ? 'Excellent' : metrics.routeEfficiency >= 85 ? 'Good' : 'Needs Work',
        trend: 'improving',
        percentage: metrics.routeEfficiency
      }
    };
  }

  async getPerformanceHints(courierId: string): Promise<any[]> {
    const insights = await this.generatePerformanceInsights(courierId);
    
    return insights
      .filter(insight => insight.actionable && insight.recommendation)
      .map(insight => ({
        metric: insight.metric,
        hint: insight.recommendation,
        action: insight.message,
        priority: insight.impact
      }));
  }
}