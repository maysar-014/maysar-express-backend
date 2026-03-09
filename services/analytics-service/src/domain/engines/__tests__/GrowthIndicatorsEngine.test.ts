import { GrowthIndicatorsEngine } from '../GrowthIndicatorsEngine';

describe('GrowthIndicatorsEngine', () => {
    let engine: GrowthIndicatorsEngine;

    beforeEach(() => {
        engine = new GrowthIndicatorsEngine();
    });

    it('calculates revenue growth percentage across sellers', () => {
        expect(engine.calculateRevenueGrowthMoM([])).toBe(0);
        expect(
            engine.calculateRevenueGrowthMoM([
                { sellerId: 's1', currentMonthRevenue: 200, previousMonthRevenue: 100 },
                { sellerId: 's2', currentMonthRevenue: 50, previousMonthRevenue: 100 },
                { sellerId: 's3', currentMonthRevenue: 40, previousMonthRevenue: 0 }
            ])
        ).toBeCloseTo((2 / 3) * 100);
    });

    it('calculates product velocity with zero-day protection', () => {
        expect(engine.calculateProductVelocity([])).toBe(0);
        expect(
            engine.calculateProductVelocity([
                { productId: 'p1', totalQuantitySold: 30, daysSinceLaunch: 10 },
                { productId: 'p2', totalQuantitySold: 10, daysSinceLaunch: 0 }
            ])
        ).toBe(1.5);
    });

    it('calculates repeat buyer rate and aggregate metrics', () => {
        expect(engine.calculateRepeatBuyerRate([])).toBe(0);
        expect(
            engine.calculateRepeatBuyerRate([
                { buyerId: 'b1', orderCount: 2 },
                { buyerId: 'b2', orderCount: 1 }
            ])
        ).toBe(50);

        expect(
            engine.calculateMetrics(
                [{ sellerId: 's1', currentMonthRevenue: 120, previousMonthRevenue: 100 }],
                [{ productId: 'p1', totalQuantitySold: 60, daysSinceLaunch: 30 }],
                [{ buyerId: 'b1', orderCount: 2 }]
            )
        ).toEqual({
            revenueGrowthMoM: 100,
            productVelocityAvg: 2,
            repeatBuyerRate: 100
        });
    });
});
