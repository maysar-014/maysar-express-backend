import { Metric } from '../entities/Metric.entity';
import { AnalyticsEvent } from '../entities/AnalyticsEvent.entity';
import { MetricCalculationService } from '../services/MetricCalculationService';
import { StatisticalAlgorithm } from '../algorithms/StatisticalAlgorithm';
import { MetricValue } from '../value-objects/metric-value.value-object';

export interface AnalyticsInput {
    eventType: string;
    data: Record<string, any>;
    timestamp: Date;
    context: {
        userId?: string;
        sellerId?: string;
        region?: string;
        channel: string;
        source: string;
    };
}

export interface AnalyticsOutput {
    eventId: string;
    metrics: Metric[];
    insights: any[];
    predictions: any[];
    confidence: number;
}

export class AnalyticsProcessingEngine {
    constructor(
        private readonly metricService: MetricCalculationService,
        private readonly statsAlgorithm: StatisticalAlgorithm
    ) { }

    async processEvent(event: AnalyticsEvent, context: AnalyticsInput['context']): Promise<AnalyticsOutput> {
        const metrics: Metric[] = [];

        // Deterministic processing based on event type
        if (event.type === 'order' || event.type === 'payment') {
            const revenue = this.metricService.calculateRevenue([event]);
            metrics.push(new Metric({
                id: `met_rev_${Date.now()}`,
                type: 'revenue',
                value: revenue,
                dimension: context.sellerId || 'global',
                period: 'realtime',
                timestamp: new Date(),
                confidence: 100
            }));

            const count = this.metricService.calculateOrderCount([event]);
            metrics.push(new Metric({
                id: `met_cnt_${Date.now()}`,
                type: 'order_count',
                value: count,
                dimension: context.sellerId || 'global',
                period: 'realtime',
                timestamp: new Date(),
                confidence: 100
            }));
        }

        // Add more complex algorithms here (e.g. anomaly detection if we had historical context)
        // For now, focus on real-time deterministic metrics

        return {
            eventId: event.id,
            metrics,
            insights: [], // Future: Integration with InsightEngine
            predictions: [], // Future: Integration with PredictionEngine
            confidence: 1.0
        };
    }
}
