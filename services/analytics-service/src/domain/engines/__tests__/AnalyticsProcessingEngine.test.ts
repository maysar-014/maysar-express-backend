import { AnalyticsProcessingEngine } from '../AnalyticsProcessingEngine';
import { MetricCalculationService } from '../../services/MetricCalculationService';
import { StatisticalAlgorithm } from '../../algorithms/StatisticalAlgorithm';
import { AnalyticsEvent } from '../../entities/AnalyticsEvent.entity';

describe('AnalyticsProcessingEngine', () => {
    let engine: AnalyticsProcessingEngine;
    let metricService: MetricCalculationService;
    let statsAlgorithm: StatisticalAlgorithm;

    beforeEach(() => {
        metricService = new MetricCalculationService();
        statsAlgorithm = new StatisticalAlgorithm();
        engine = new AnalyticsProcessingEngine(metricService, statsAlgorithm);
    });

    it('should process order events and generate revenue and count metrics', async () => {
        const event = new AnalyticsEvent({
            id: 'evt_1',
            type: 'order',
            data: { amount: 100 },
            timestamp: new Date(),
            status: 'pending'
        });

        const context = {
            channel: 'web',
            source: 'test_source',
            sellerId: 'seller_123'
        };

        const result = await engine.processEvent(event, context);

        expect(result.eventId).toBe('evt_1');
        expect(result.metrics).toHaveLength(2);

        const revenueMetric = result.metrics.find(m => m.type === 'revenue');
        expect(revenueMetric).toBeDefined();
        expect(revenueMetric?.value.toNumber()).toBe(100);
        expect(revenueMetric?.dimension).toBe('seller_123');

        const countMetric = result.metrics.find(m => m.type === 'order_count');
        expect(countMetric).toBeDefined();
        expect(countMetric?.value.toNumber()).toBe(1);
    });

    it('should process payment events similar to order events', async () => {
        const event = new AnalyticsEvent({
            id: 'evt_2',
            type: 'payment',
            data: { amount: 250 },
            timestamp: new Date(),
            status: 'pending'
        });

        const context = {
            channel: 'mobile',
            source: 'app',
            sellerId: 'seller_456'
        };

        const result = await engine.processEvent(event, context);

        expect(result.metrics).toHaveLength(2);
        const revenueMetric = result.metrics.find(m => m.type === 'revenue');
        expect(revenueMetric?.value.toNumber()).toBe(250);
    });

    it('should return empty metrics for unknown event types', async () => {
        const event = new AnalyticsEvent({
            id: 'evt_3',
            type: 'unknown_type',
            data: {},
            timestamp: new Date(),
            status: 'pending'
        });

        const context = {
            channel: 'api',
            source: 'internal'
        };

        const result = await engine.processEvent(event, context);

        expect(result.metrics).toHaveLength(0);
    });
});
