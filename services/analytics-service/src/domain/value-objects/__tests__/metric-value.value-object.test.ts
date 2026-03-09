import { MetricValue } from '../metric-value.value-object';

describe('MetricValue', () => {
    it('validates numeric input and exposes numeric value', () => {
        expect(() => MetricValue.create(Number.NaN)).toThrow('Metric value must be a finite number');
        expect(() => new MetricValue(undefined as unknown as number)).toThrow(
            'Metric value cannot be null or undefined'
        );
        expect(MetricValue.create(100).toNumber()).toBe(100);
    });

    it('supports comparisons and arithmetic', () => {
        const a = MetricValue.create(10);
        const b = MetricValue.create(5);

        expect(a.isGreaterThan(b)).toBe(true);
        expect(b.isLessThan(a)).toBe(true);
        expect(a.isEqualTo(MetricValue.create(10))).toBe(true);
        expect(a.add(b).toNumber()).toBe(15);
        expect(a.subtract(b).toNumber()).toBe(5);
        expect(a.multiply(2).toNumber()).toBe(20);
        expect(a.divide(2).toNumber()).toBe(5);
    });

    it('provides zero constructor and rejects divide by zero', () => {
        expect(MetricValue.zero().toNumber()).toBe(0);
        expect(() => MetricValue.create(10).divide(0)).toThrow('Cannot divide by zero');
        expect(MetricValue.create(42).toString()).toBe('42');
    });
});
