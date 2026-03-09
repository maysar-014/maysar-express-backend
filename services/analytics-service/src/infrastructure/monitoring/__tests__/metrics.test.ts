import metrics, { metricsCollector, metricsRegistry, register } from '../metrics';

describe('analytics monitoring metrics module', () => {
    it('exports initialized metrics, collector, and backward-compatible register alias', () => {
        expect(metrics).toBeDefined();
        expect(metricsCollector).toBeDefined();
        expect(metricsRegistry).toBeDefined();
        expect(register).toBe(metricsRegistry);
    });
});
