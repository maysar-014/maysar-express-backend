import { AlertEngine } from '../AlertEngine';
import { Metric } from '../../entities/Metric.entity';
import { MetricValue } from '../../value-objects/metric-value.value-object';

function buildMetric(type: string, value: number): Metric {
    return new Metric({
        id: `${type}-${value}`,
        type,
        value: MetricValue.create(value),
        dimension: 'seller-1',
        period: 'day',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        confidence: 90
    });
}

describe('AlertEngine', () => {
    it('returns null when rule does not trigger', async () => {
        const engine = new AlertEngine([
            { metricType: 'revenue', threshold: 1000, condition: 'above', severity: 'high' }
        ]);

        const result = await engine.processMetric(buildMetric('revenue', 500));
        expect(result).toBeNull();
    });

    it('builds alerts when rule triggers', async () => {
        const engine = new AlertEngine([
            { metricType: 'revenue', threshold: 1000, condition: 'above', severity: 'critical' }
        ]);

        const result = await engine.processMetric(buildMetric('revenue', 1500));

        expect(result).not.toBeNull();
        expect(result?.type).toBe('revenue');
        expect(result?.severity).toBe('critical');
        expect(result?.actions).toEqual(['notify_admin']);
        expect(result?.message).toContain('above threshold');
    });
});
