import { CourierMetrics, CourierPerformanceReport } from '../types';

export class CourierAnalyticsEngine {
    generatePerformanceReport(metrics: CourierMetrics): CourierPerformanceReport {
        return {
            efficiency: metrics.averageDeliveryTime < 25 ? 'high' : 'medium',
            reliability: metrics.deliveriesCompleted > 30 ? 'excellent' : 'good',
            rating: metrics.customerRating
        };
    }
}
