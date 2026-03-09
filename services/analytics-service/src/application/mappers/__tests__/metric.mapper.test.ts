import { MetricMapper } from '../metric.mapper';
import { Metric } from '../../../domain/entities/Metric.entity';
import { MetricValue } from '../../../domain/value-objects/metric-value.value-object';

describe('MetricMapper', () => {
    it('maps entity to dto', () => {
        const entity = new Metric({
            id: 'metric-1',
            type: 'revenue',
            value: MetricValue.create(150),
            dimension: 'seller-1',
            period: 'day',
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
            confidence: 90
        });

        expect(MetricMapper.toDto(entity)).toEqual({
            id: 'metric-1',
            type: 'revenue',
            value: 150,
            dimension: 'seller-1',
            period: 'day',
            timestamp: '2026-01-01T00:00:00.000Z',
            confidence: 90
        });
    });

    it('maps dto to entity and generates id when missing', () => {
        const withId = MetricMapper.toEntity({
            id: 'metric-2',
            type: 'orders',
            value: 9,
            dimension: 'seller-2',
            period: 'day',
            timestamp: '2026-01-02T00:00:00.000Z',
            confidence: 75
        });

        expect(withId.id).toBe('metric-2');
        expect(withId.value.toNumber()).toBe(9);

        const withoutId = MetricMapper.toEntity({
            type: 'orders',
            value: 2,
            dimension: 'seller-2',
            period: 'day',
            timestamp: '2026-01-02T00:00:00.000Z',
            confidence: 75
        });

        expect(withoutId.id.startsWith('met_')).toBe(true);
    });
});
