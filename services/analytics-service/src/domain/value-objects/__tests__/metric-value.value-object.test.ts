import { MetricValue } from '../metric-value.value-object';

describe('MetricValue', () => {
    it('should create metric value', () => {
        const value = MetricValue.create(100, 'USD');
        expect(value.getValue()).toBe(100);
    });

    it('should format value', () => {
        const value = MetricValue.create(1000, 'USD');
        expect(value.format()).toContain('1000');
    });
});
