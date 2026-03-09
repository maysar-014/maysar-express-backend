import { AggregationService } from '../AggregationService';
import { Metric } from '../../entities/Metric.entity';
import { MetricValue } from '../../value-objects/metric-value.value-object';

function metric(id: string, dimension: string, value: number): Metric {
    return new Metric({
        id,
        type: 'revenue',
        value: MetricValue.create(value),
        dimension,
        period: 'day',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        confidence: 90
    });
}

describe('AggregationService', () => {
    const service = new AggregationService();

    it('sums metric values', () => {
        const result = service.sum([metric('m1', 'A', 10), metric('m2', 'A', 15)]);
        expect(result.toNumber()).toBe(25);
    });

    it('averages metric values and handles empty arrays', () => {
        expect(service.average([metric('m1', 'A', 12), metric('m2', 'A', 18)]).toNumber()).toBe(15);
        expect(service.average([]).toNumber()).toBe(0);
    });

    it('groups metrics by dimension', () => {
        const grouped = service.groupByDimension([
            metric('m1', 'seller-1', 10),
            metric('m2', 'seller-2', 20),
            metric('m3', 'seller-1', 30)
        ]);

        expect(Object.keys(grouped)).toEqual(['seller-1', 'seller-2']);
        expect(grouped['seller-1']).toHaveLength(2);
        expect(grouped['seller-2']).toHaveLength(1);
    });
});
