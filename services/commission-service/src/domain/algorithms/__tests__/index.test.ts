import {
    BonusCalculationAlgorithm,
    CommissionRateAlgorithm,
    PayoutSchedulingAlgorithm
} from '../index';
import { CommissionAmount } from '../../value-objects/monetary.value-object';

describe('Domain Algorithms', () => {
    describe('BonusCalculationAlgorithm', () => {
        const baseAmount = CommissionAmount.fromNumber(100);

        it('calculatePerformanceBonus should return zero if score <= target', () => {
            expect(BonusCalculationAlgorithm.calculatePerformanceBonus(baseAmount, 0.7, 0.8).isZero()).toBe(true);
        });

        it('calculatePerformanceBonus should return linear bonus above target', () => {
            // (0.9 - 0.8) / (1 - 0.8) = 0.1 / 0.2 = 0.5 multiplier
            // 100 * 0.5 = 50
            expect(BonusCalculationAlgorithm.calculatePerformanceBonus(baseAmount, 0.9, 0.8).toNumber()).toBe(50);
        });

        it('calculateQualityBonus should combine multiple factors', () => {
            // 5.0 rating (+10%), onTime (+5%), satisfaction 4.6 (+3%) = 18% bonus
            const bonus = BonusCalculationAlgorithm.calculateQualityBonus(baseAmount, 5.0, true, 4.6);
            expect(bonus.toNumber()).toBe(18);
        });

        it('calculateVolumeBonus should apply tiered logic', () => {
            expect(BonusCalculationAlgorithm.calculateVolumeBonus(60000, baseAmount).toNumber()).toBe(5); // 5% tier
            expect(BonusCalculationAlgorithm.calculateVolumeBonus(5000, baseAmount).isZero()).toBe(true);
        });

        it('calculateLoyaltyBonus should apply tenure logic', () => {
            expect(BonusCalculationAlgorithm.calculateLoyaltyBonus(12, baseAmount).toNumber()).toBe(2); // 2% tier
            expect(BonusCalculationAlgorithm.calculateLoyaltyBonus(3, baseAmount).isZero()).toBe(true);
        });
    });

    describe('CommissionRateAlgorithm', () => {
        it('calculateDynamicRate should adjust based on demand and competition', () => {
            const base = 0.1;
            const rate = CommissionRateAlgorithm.calculateDynamicRate(base, 0.8, 0.4, 0.9);
            expect(rate).toBeGreaterThan(base);
        });

        it('calculateTieredRate should return correct rates for values', () => {
            expect(CommissionRateAlgorithm.calculateTieredRate(50)).toBe(0.05);
            expect(CommissionRateAlgorithm.calculateTieredRate(2000)).toBe(0.12);
        });

        it('calculatePromotionalRate should decay over time', () => {
            const start = new Date('2026-01-01');
            const now = new Date('2026-01-05');
            const rate = CommissionRateAlgorithm.calculatePromotionalRate(0.1, start, now, 10);
            expect(rate).toBeLessThan(0.1);
        });
    });

    describe('PayoutSchedulingAlgorithm', () => {
        it('calculateOptimalPayoutDate should increase holding for high risk', () => {
            const date1 = PayoutSchedulingAlgorithm.calculateOptimalPayoutDate(100, 1, 0.2);
            const date2 = PayoutSchedulingAlgorithm.calculateOptimalPayoutDate(100, 1, 0.8);
            expect(date2.getTime()).toBeGreaterThan(date1.getTime());
        });

        it('batchCommissionsForPayout should group commissions correctly', () => {
            const comms = [
                { id: '1', amount: 1000, recipientId: 'r1', age: 5 },
                { id: '2', amount: 2000, recipientId: 'r2', age: 10 }
            ];
            const batches = PayoutSchedulingAlgorithm.batchCommissionsForPayout(comms, 10, 2500);
            expect(batches.length).toBe(2);
        });

        it('calculatePayoutPriority should score correctly', () => {
            const p1 = PayoutSchedulingAlgorithm.calculatePayoutPriority(100, 5, 'seller', 0.9);
            const p2 = PayoutSchedulingAlgorithm.calculatePayoutPriority(5000, 30, 'courier', 1.0);
            expect(p2).toBeGreaterThan(p1);
        });
    });
});
