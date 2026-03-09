import { CreateMetricDtoSchema, MetricDtoSchema } from '../metric.dto';

describe('MetricDtoSchema', () => {
    it('validates full metric DTOs', () => {
        const input = {
            id: '11111111-1111-4111-8111-111111111111',
            type: 'revenue',
            value: 100,
            dimension: 'seller-1',
            period: 'day',
            timestamp: '2026-01-01T00:00:00.000Z',
            confidence: 90
        };

        expect(MetricDtoSchema.parse(input)).toEqual(input);
    });

    it('validates create DTO without id and rejects invalid confidence', () => {
        expect(
            CreateMetricDtoSchema.parse({
                type: 'revenue',
                value: 100,
                dimension: 'seller-1',
                period: 'day',
                timestamp: '2026-01-01T00:00:00.000Z',
                confidence: 50
            })
        ).toEqual(
            expect.objectContaining({
                type: 'revenue',
                confidence: 50
            })
        );

        expect(() =>
            CreateMetricDtoSchema.parse({
                type: 'revenue',
                value: 100,
                dimension: 'seller-1',
                period: 'day',
                timestamp: '2026-01-01T00:00:00.000Z',
                confidence: 101
            })
        ).toThrow();
    });
});
