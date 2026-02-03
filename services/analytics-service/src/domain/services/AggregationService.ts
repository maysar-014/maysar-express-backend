import { Metric } from '../entities/Metric.entity';
import { MetricValue } from '../value-objects/metric-value.value-object';

export class AggregationService {
    sum(metrics: Metric[]): MetricValue {
        const total = metrics.reduce((acc, m) => acc + m.value.toNumber(), 0);
        return new MetricValue(total);
    }

    average(metrics: Metric[]): MetricValue {
        if (metrics.length === 0) return new MetricValue(0);
        const total = this.sum(metrics);
        return total.divide(metrics.length);
    }

    groupByDimension(metrics: Metric[]): Record<string, Metric[]> {
        return metrics.reduce((groups, metric) => {
            const dim = metric.dimension;
            if (!groups[dim]) groups[dim] = [];
            groups[dim].push(metric);
            return groups;
        }, {} as Record<string, Metric[]>);
    }
}
