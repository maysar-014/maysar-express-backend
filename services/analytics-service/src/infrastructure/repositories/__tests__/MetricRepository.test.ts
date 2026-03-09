const mockPrisma = {
    analytics_Metric: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn()
    }
};

jest.mock('../../database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

import { MetricRepository } from '../MetricRepository';
import { Metric } from '../../../domain/entities/Metric.entity';
import { MetricValue } from '../../../domain/value-objects/metric-value.value-object';

function metric(id: string, value: number): Metric {
    return new Metric({
        id,
        type: 'revenue',
        value: MetricValue.create(value),
        dimension: 'seller-1',
        period: 'day',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        confidence: 90
    });
}

describe('MetricRepository', () => {
    let repository: MetricRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new MetricRepository();
    });

    it('saves metrics via upsert', async () => {
        mockPrisma.analytics_Metric.upsert.mockResolvedValue(undefined);
        await repository.save(metric('metric-1', 100));

        expect(mockPrisma.analytics_Metric.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'metric-1' },
                update: expect.objectContaining({
                    value: 100,
                    confidence: 90,
                    timestamp: expect.any(Date)
                }),
                create: expect.objectContaining({
                    id: 'metric-1',
                    metricType: 'revenue',
                    value: 100,
                    dimension: 'seller-1',
                    period: 'day',
                    timestamp: expect.any(Date),
                    confidence: 90
                })
            })
        );
    });

    it('finds metrics by period and maps them to domain entities', async () => {
        const start = new Date('2026-01-01T00:00:00.000Z');
        const end = new Date('2026-01-31T23:59:59.000Z');

        mockPrisma.analytics_Metric.findMany.mockResolvedValue([
            {
                id: 'm1',
                metricType: 'revenue',
                value: 11,
                dimension: 'seller-1',
                period: 'day',
                timestamp: new Date('2026-01-02T00:00:00.000Z'),
                confidence: 80
            },
            {
                id: 'm2',
                metricType: 'revenue',
                value: 22,
                dimension: 'seller-1',
                period: 'day',
                timestamp: new Date('2026-01-03T00:00:00.000Z'),
                confidence: 85
            }
        ]);

        const result = await repository.findByPeriod('revenue', 'seller-1', start, end);

        expect(mockPrisma.analytics_Metric.findMany).toHaveBeenCalledWith({
            where: {
                metricType: 'revenue',
                dimension: 'seller-1',
                timestamp: { gte: start, lte: end }
            },
            orderBy: { timestamp: 'asc' }
        });
        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Metric);
        expect(result[0].value.toNumber()).toBe(11);
        expect(result[1].confidence).toBe(85);
    });

    it('gets latest metric and handles not-found', async () => {
        mockPrisma.analytics_Metric.findFirst.mockResolvedValueOnce(null);
        expect(await repository.getLatest('revenue', 'seller-1')).toBeNull();

        mockPrisma.analytics_Metric.findFirst.mockResolvedValueOnce({
            id: 'latest',
            metricType: 'revenue',
            value: 99,
            dimension: 'seller-1',
            period: 'day',
            timestamp: new Date('2026-01-05T00:00:00.000Z'),
            confidence: 95
        });

        const latest = await repository.getLatest('revenue', 'seller-1');
        expect(mockPrisma.analytics_Metric.findFirst).toHaveBeenLastCalledWith({
            where: { metricType: 'revenue', dimension: 'seller-1' },
            orderBy: { timestamp: 'desc' }
        });
        expect(latest?.id).toBe('latest');
        expect(latest?.value.toNumber()).toBe(99);
    });
});
