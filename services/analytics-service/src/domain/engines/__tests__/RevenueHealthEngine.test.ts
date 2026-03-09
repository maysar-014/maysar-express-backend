import { RevenueHealthEngine } from '../RevenueHealthEngine';

describe('RevenueHealthEngine', () => {
    let engine: RevenueHealthEngine;

    beforeEach(() => {
        engine = new RevenueHealthEngine();
    });

    it('calculates ARPS from numeric and decimal-like revenues', () => {
        expect(engine.calculateARPS(1000, 4, 'weekly')).toBe(250);
        expect(engine.calculateARPS({ toNumber: () => 500 }, 5, 'monthly')).toBe(100);
        expect(engine.calculateARPS(1000, 0, 'weekly')).toBe(0);
    });

    it('calculates median revenue for odd/even arrays', () => {
        expect(engine.calculateMedianRevenue([])).toBe(0);
        expect(engine.calculateMedianRevenue([10, 20, 30])).toBe(20);
        expect(engine.calculateMedianRevenue([10, 20, 30, 40])).toBe(25);
    });

    it('calculates top-20 revenue distribution', () => {
        expect(engine.calculateRevenueDistribution([])).toBe(0);
        expect(engine.calculateRevenueDistribution([0, 0, 0])).toBe(0);
        expect(engine.calculateRevenueDistribution([100, 80, 20, 0, 0])).toBe(50);
    });

    it('returns weekly/monthly aggregate metrics', () => {
        expect(engine.calculateMetrics([100, 50, 0], 'weekly')).toEqual({
            arpsWeekly: 75,
            arpsMonthly: 0,
            medianRevenue: 50,
            revenueDistributionTop20: 66.66666666666666
        });

        expect(engine.calculateMetrics([100, 50, 0], 'monthly')).toEqual({
            arpsWeekly: 0,
            arpsMonthly: 75,
            medianRevenue: 50,
            revenueDistributionTop20: 66.66666666666666
        });
    });
});
