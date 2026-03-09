import { TrendAnalysisService } from '../TrendAnalysisService';
import { Metric } from '../../entities/Metric.entity';
import { MetricValue } from '../../value-objects/metric-value.value-object';

function metric(id: string, timestampIso: string, value: number): Metric {
    return new Metric({
        id,
        type: 'revenue',
        value: MetricValue.create(value),
        dimension: 'seller-1',
        period: 'day',
        timestamp: new Date(timestampIso),
        confidence: 90
    });
}

describe('TrendAnalysisService', () => {
    const service = new TrendAnalysisService();

    it('calculates growth from current and previous metrics', () => {
        const previous = metric('m1', '2026-01-01T00:00:00.000Z', 100);
        const current = metric('m2', '2026-01-02T00:00:00.000Z', 120);

        expect(service.calculateGrowth(current, previous)).toBeCloseTo(20);
    });

    it('identifies direction from growth thresholds', () => {
        expect(service.identifyDirection(6)).toBe('up');
        expect(service.identifyDirection(-6)).toBe('down');
        expect(service.identifyDirection(3)).toBe('stable');
    });

    it('returns stable trend for insufficient metrics', () => {
        expect(service.analyzeTrend([metric('m1', '2026-01-01T00:00:00.000Z', 100)])).toEqual({
            direction: 'stable',
            magnitude: 0
        });
    });

    it('analyzes trend using time-sorted metrics', () => {
        const result = service.analyzeTrend([
            metric('m3', '2026-01-03T00:00:00.000Z', 95),
            metric('m1', '2026-01-01T00:00:00.000Z', 100),
            metric('m2', '2026-01-02T00:00:00.000Z', 90)
        ]);

        expect(result.direction).toBe('stable');
        expect(result.magnitude).toBeCloseTo(-5);
    });
});
