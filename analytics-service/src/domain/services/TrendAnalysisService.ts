import { Metric } from '../entities/Metric.entity';

export class TrendAnalysisService {
    calculateGrowth(current: Metric, previous: Metric): number {
        return current.calculateTrend(previous);
    }

    identifyDirection(growth: number): 'up' | 'down' | 'stable' {
        if (growth > 5) return 'up';
        if (growth < -5) return 'down';
        return 'stable';
    }

    analyzeTrend(metrics: Metric[]): { direction: 'up' | 'down' | 'stable'; magnitude: number } {
        if (metrics.length < 2) {
            return { direction: 'stable', magnitude: 0 };
        }

        const sorted = [...metrics].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const magnitude = last.calculateTrend(first);
        const direction = this.identifyDirection(magnitude);

        return { direction, magnitude };
    }
}
