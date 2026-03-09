import { Insight, InsightProperties } from '../Insight.entity';

const baseProps: InsightProperties = {
    id: 'ins-1',
    type: 'trend',
    message: 'Revenue is trending up',
    priority: 'high',
    metric: 'revenue',
    metadata: { delta: 12.5 },
    timestamp: new Date('2026-01-01T00:00:00.000Z')
};

describe('Insight', () => {
    it('exposes immutable properties', () => {
        const insight = new Insight(baseProps);
        const metadata = insight.metadata!;
        metadata.delta = 999;

        expect(insight.id).toBe('ins-1');
        expect(insight.type).toBe('trend');
        expect(insight.priority).toBe('high');
        expect(insight.metric).toBe('revenue');
        expect(insight.metadata).toEqual({ delta: 12.5 });
    });

    it('serializes to JSON', () => {
        const insight = new Insight(baseProps);
        expect(insight.toJSON()).toEqual({
            id: 'ins-1',
            type: 'trend',
            message: 'Revenue is trending up',
            priority: 'high',
            metric: 'revenue',
            metadata: { delta: 12.5 },
            timestamp: '2026-01-01T00:00:00.000Z'
        });
    });
});
