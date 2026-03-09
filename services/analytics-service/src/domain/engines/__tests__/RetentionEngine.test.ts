import { RetentionEngine } from '../RetentionEngine';

describe('RetentionEngine', () => {
    let engine: RetentionEngine;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
        engine = new RetentionEngine();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('calculates 90-day retention based on recent activity', () => {
        expect(engine.calculateRetention90Days([])).toBe(0);

        const metrics = engine.calculateRetention90Days([
            {
                sellerId: 'eligible-active',
                createdAt: new Date('2025-10-01T00:00:00.000Z'),
                lastOrderAt: new Date('2026-03-20T00:00:00.000Z'),
                lastProductListedAt: null,
                isActive: true
            },
            {
                sellerId: 'eligible-inactive',
                createdAt: new Date('2025-10-01T00:00:00.000Z'),
                lastOrderAt: new Date('2026-01-01T00:00:00.000Z'),
                lastProductListedAt: null,
                isActive: false
            },
            {
                sellerId: 'not-eligible',
                createdAt: new Date('2026-03-15T00:00:00.000Z'),
                lastOrderAt: new Date('2026-03-20T00:00:00.000Z'),
                lastProductListedAt: null,
                isActive: true
            }
        ]);

        expect(metrics).toBe(50);
    });

    it('calculates churn rate', () => {
        expect(engine.calculateChurnRate([])).toBe(0);
        expect(
            engine.calculateChurnRate([
                { sellerId: 's1', wasActivePreviousMonth: true, isActiveCurrentMonth: false },
                { sellerId: 's2', wasActivePreviousMonth: true, isActiveCurrentMonth: true },
                { sellerId: 's3', wasActivePreviousMonth: false, isActiveCurrentMonth: false }
            ])
        ).toBe(50);
    });

    it('calculates time to first sale with clamped negatives and rounded aggregate metrics', () => {
        expect(engine.calculateTimeToFirstSale([])).toBe(0);
        expect(
            engine.calculateTimeToFirstSale([
                {
                    sellerId: 's1',
                    userCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    firstOrderAt: new Date('2026-01-11T00:00:00.000Z')
                },
                {
                    sellerId: 's2',
                    userCreatedAt: new Date('2026-01-10T00:00:00.000Z'),
                    firstOrderAt: new Date('2026-01-05T00:00:00.000Z')
                }
            ])
        ).toBe(5);

        const result = engine.calculateMetrics(
            [],
            [],
            [
                {
                    sellerId: 's1',
                    userCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    firstOrderAt: new Date('2026-01-02T12:00:00.000Z')
                }
            ]
        );

        expect(result).toEqual({
            retentionRate90Days: 0,
            churnRateMonthly: 0,
            avgTimeToFirstSaleDays: 1
        });
    });
});
