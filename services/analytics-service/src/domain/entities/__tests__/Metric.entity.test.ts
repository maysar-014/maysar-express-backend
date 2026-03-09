import { Metric } from '../Metric.entity';
import { MetricValue } from '../../value-objects/metric-value.value-object';

function buildMetric(type: string, value: number, confidence: number = 80): Metric {
    return new Metric({
        id: `${type}-${value}`,
        type,
        value: MetricValue.create(value),
        dimension: 'seller-1',
        period: 'day',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        confidence
    });
}

describe('Metric', () => {
    it('validates confidence range', () => {
        expect(() => buildMetric('revenue', 100, -1)).toThrow('Confidence must be between 0 and 100');
        expect(() => buildMetric('revenue', 100, 101)).toThrow('Confidence must be between 0 and 100');
    });

    it('checks threshold and trend calculations', () => {
        const previous = buildMetric('revenue', 100);
        const current = buildMetric('revenue', 125);
        const zeroBase = buildMetric('revenue', 0);
        const fromZero = buildMetric('revenue', 50);

        expect(current.isAboveThreshold(120)).toBe(true);
        expect(current.calculateTrend(previous)).toBeCloseTo(25);
        expect(fromZero.calculateTrend(zeroBase)).toBe(100);
    });

    it('throws when calculating trend across different metric types', () => {
        const revenue = buildMetric('revenue', 120);
        const orders = buildMetric('order_count', 10);

        expect(() => revenue.calculateTrend(orders)).toThrow(
            'Cannot calculate trend between different metric types'
        );
    });

    it('serializes to JSON', () => {
        const metric = buildMetric('revenue', 999, 95);

        expect(metric.toJSON()).toEqual({
            id: 'revenue-999',
            type: 'revenue',
            value: 999,
            dimension: 'seller-1',
            period: 'day',
            timestamp: '2026-01-01T00:00:00.000Z',
            confidence: 95
        });
    });
});
