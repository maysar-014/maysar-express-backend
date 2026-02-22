import { Metric } from '../Metric.entity';

describe('Metric', () => {
    it('should create metric', () => {
        const metric = Metric.create({ id: 'm1', name: 'revenue', value: 1000, unit: 'USD' });
        expect(metric.getId()).toBe('m1');
    });

    it('should update value', () => {
        const metric = Metric.create({ id: 'm1', name: 'revenue', value: 1000, unit: 'USD' });
        metric.updateValue(1500);
        expect(metric.getValue()).toBe(1500);
    });
});
