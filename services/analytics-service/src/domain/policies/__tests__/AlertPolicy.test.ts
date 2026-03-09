import { AlertPolicy } from '../AlertPolicy';
import { Metric } from '../../entities/Metric.entity';
import { MetricValue } from '../../value-objects/metric-value.value-object';

function buildMetric(type: string, value: number): Metric {
    return new Metric({
        id: `m-${type}-${value}`,
        type,
        value: MetricValue.create(value),
        dimension: 'seller-1',
        period: 'day',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        confidence: 90
    });
}

describe('AlertPolicy', () => {
    it('triggers for matching above-threshold rules', () => {
        const policy = new AlertPolicy([
            { metricType: 'revenue', threshold: 100, condition: 'above', severity: 'high' }
        ]);

        const result = policy.shouldTriggerAlert(buildMetric('revenue', 120));
        expect(result.trigger).toBe(true);
        expect(result.rule?.severity).toBe('high');
    });

    it('does not trigger when no rule exists', () => {
        const policy = new AlertPolicy([]);
        const result = policy.shouldTriggerAlert(buildMetric('revenue', 120));

        expect(result.trigger).toBe(false);
        expect(result.rule).toBeUndefined();
    });

    it('supports below-threshold rules and derived severity', () => {
        const policy = new AlertPolicy([
            { metricType: 'availability', threshold: 99, condition: 'below', severity: 'critical' }
        ]);

        expect(policy.getTriggeredSeverity(buildMetric('availability', 97))).toBe('critical');
        expect(policy.getTriggeredSeverity(buildMetric('availability', 100))).toBeNull();
    });
});
