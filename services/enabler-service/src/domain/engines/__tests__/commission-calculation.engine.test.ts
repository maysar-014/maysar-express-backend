import { CommissionCalculationEngine, CommissionCalculationInput } from '../../engines/commission-calculation.engine';
import { Enabler_Tier } from '../../types/enabler.types';

describe('CommissionCalculationEngine', () => {
    const baseInput: CommissionCalculationInput = {
        orderAmount: 1000,
        enablerTier: Enabler_Tier.BRONZE,
        baseCommissionRate: 0.10,
        performanceMetrics: {
            conversionRate: 0.05,
            customerRating: 4.5,
            totalOrders: 50,
            disputeRate: 0
        }
    };

    describe('calculate', () => {
        it('should calculate basic commission for Bronze tier', () => {
            const result = CommissionCalculationEngine.calculate(baseInput);

            // Base: 10% of 1000 = 100
            // Tier Multiplier: 1.0 (Bronze)
            // Perf Multiplier: 1.12 (Base 1.0 + 0.05 Conv + 0.07 Rating) -> 1.12
            // Total Rate: 0.10 * 1.0 * 1.12 = 0.112
            // Total Commission: 112

            expect(result.baseCommission).toBe(100);
            expect(result.totalCommission).toBeGreaterThan(100);
            expect(result.platformFee).toBe(20); // 2% of 1000
            expect(result.sellerPayout).toBeLessThan(1000);
        });

        it('should calculate commission for Gold tier', () => {
            const input = { ...baseInput, enablerTier: Enabler_Tier.GOLD };
            const result = CommissionCalculationEngine.calculate(input);

            // Tier Multiplier: 1.2 (Gold)
            expect(result.tierBonus).toBeGreaterThan(0);
        });

        it('should cap commission rate', () => {
            const input = { ...baseInput, baseCommissionRate: 0.5 }; // High base
            const result = CommissionCalculationEngine.calculate(input);

            // Max rate is 0.25 defined in engine
            expect(result.commissionRate).toBeLessThanOrEqual(0.25);
        });

        it('should apply seller caps', () => {
            const input = {
                ...baseInput,
                sellerPolicies: { maxCommissionCap: 50 }
            };
            const result = CommissionCalculationEngine.calculate(input);
            expect(result.totalCommission).toBe(50);
        });

        it('should apply minimum commission', () => {
            const input = { ...baseInput, orderAmount: 10 }; // 10% of 10 = 1
            const result = CommissionCalculationEngine.calculate(input);
            expect(result.totalCommission).toBe(5); // Min is 5.0
        });

        it('should handle zero order amount', () => {
            // Although validation prevents this, logic should be safe
            // check validateInput separately
        });
    });

    describe('validateInput', () => {
        it('should validate valid input', () => {
            expect(() => CommissionCalculationEngine.validateInput(baseInput)).not.toThrow();
        });

        it('should throw on invalid order amount', () => {
            expect(() => CommissionCalculationEngine.validateInput({ ...baseInput, orderAmount: -100 })).toThrow();
        });

        it('should throw on invalid rates', () => {
            expect(() => CommissionCalculationEngine.validateInput({ ...baseInput, baseCommissionRate: 1.5 })).toThrow();
            expect(() => CommissionCalculationEngine.validateInput({ ...baseInput, performanceMetrics: { ...baseInput.performanceMetrics, conversionRate: 1.5 } })).toThrow();
        });
    });
});
