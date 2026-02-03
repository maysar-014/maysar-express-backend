export interface SellerKPIs {
  revenueGrowth: number;
  orderGrowth: number;
  customerRetention: number;
  profitMargin: number;
  averageOrderValue?: number;
  conversionRate?: number;
  customerLifetimeValue?: number;
  returnRate?: number;
}

export interface SalesTrend {
  revenueTrend: 'increasing' | 'decreasing' | 'stable';
  orderTrend: 'increasing' | 'decreasing' | 'stable';
  customerTrend: 'increasing' | 'decreasing' | 'stable';
  seasonality: 'high' | 'moderate' | 'low';
  growthRate?: number;
  seasonalPatterns?: string[];
  customerBehavior?: {
    repeatPurchaseRate: number;
    averageTimeBetweenOrders: number;
  };
}

export interface RealTimeData {
  activeVisitors: number;
  todayOrders?: number; // Kept for compatibility if needed
  todayRevenue?: number; // Kept for compatibility if needed
  cartAbandonment?: number;
  liveOrders?: number;
  inventoryAlerts?: number;
  customerInquiries?: number;
}

export interface Insight {
  type?: string; 
  message: string;
  priority?: string;
}

export interface PerformanceAnalysis {
  overall: 'good' | 'bad' | 'average' | 'excellent';
  bottlenecks: string[];
  improvements: string[];
}

export interface Recommendation {
  category?: string;
  action: string;
  impact?: string;
  effort?: string;
}

export interface SalesReport {
  monthlySummary: { revenue: number; orders: number; growth: number };
  topProducts: string[];
  customerSegments: { new: number; returning: number };
}

export interface CourierMetrics {
  deliveriesCompleted: number;
  averageDeliveryTime: number;
  customerRating: number;
  efficiency: number;
}

export interface CourierPerformanceReport {
  efficiency: 'high' | 'medium' | 'low';
  reliability: 'excellent' | 'good' | 'fair' | 'poor';
  rating: number;
}

export interface EnablerKPIAnalysis {
  overallScore: number;
  breakdown: {
    productivity: number;
    quality: number;
    impact: number;
  };
}

export interface ImprovementPlan {
  goals: { metric: string; target: number }[];
  timeline: string;
}

export interface BenchmarkComparison {
  industryAverage: {
    responseTime: number;
    fulfillmentTime: number;
    satisfaction: number;
    returnRate: number;
  };
  sellerRanking: string;
}

export interface PerformanceAlert {
  type: string;
  severity: string;
  message: string;
}
