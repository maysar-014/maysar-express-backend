import { AnalyticsEvent } from '../entities/AnalyticsEvent.entity';
import { MetricValue } from '../value-objects/metric-value.value-object';

export class MetricCalculationService {
    calculateRevenue(events: AnalyticsEvent[]): MetricValue {
        const total = events
            .filter(e => e.type === 'order' || e.type === 'payment')
            .reduce((sum, event) => sum + (Number(event.data.amount) || 0), 0);

        return new MetricValue(total);
    }

    calculateOrderCount(events: AnalyticsEvent[]): MetricValue {
        const count = events.filter(e => e.type === 'order').length;
        return new MetricValue(count);
    }

    calculateConversionRate(visits: number, orders: number): MetricValue {
        if (visits === 0) return new MetricValue(0);
        return new MetricValue((orders / visits) * 100);
    }

    calculateAverageOrderValue(revenue: MetricValue, count: MetricValue): MetricValue {
        if (count.toNumber() === 0) return new MetricValue(0);
        return revenue.divide(count.toNumber());
    }
}
