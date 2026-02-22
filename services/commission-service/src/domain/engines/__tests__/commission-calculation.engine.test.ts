import { CommissionCalculationEngine, CommissionCalculationInput } from '../commission-calculation.engine';
import { CommissionAmount, CommissionRate } from '../../value-objects/monetary.value-object';
import { CommissionType, RewardType } from '../../value-objects/commission-types.value-object';
import { RecipientType } from '../../value-objects/recipient-types.value-object';

describe('CommissionCalculationEngine', () => {
    describe('calculateCommission', () => {
        it('should calculate basic seller sale commission (8%)', () => {
            const input: CommissionCalculationInput = {
                orderAmount: CommissionAmount.fromNumber(1000),
                recipientType: RecipientType.SELLER,
                commissionType: CommissionType.SALE
            };

            const result = CommissionCalculationEngine.calculateCommission(input);

            expect(result.baseCommission.toNumber()).toBe(80);
            expect(result.totalCommission.toNumber()).toBe(80);
            expect(result.appliedRate.toNumber()).toBe(0.08);
        });

        it('should apply performance bonus correctly', () => {
            const input: CommissionCalculationInput = {
                orderAmount: CommissionAmount.fromNumber(1000),
                recipientType: RecipientType.SELLER,
                commissionType: CommissionType.SALE,
                performanceBonus: 0.1 // 10% bonus on base commission
            };

            const result = CommissionCalculationEngine.calculateCommission(input);

            expect(result.baseCommission.toNumber()).toBe(80);
            expect(result.breakdown.performanceBonus.toNumber()).toBe(8);
            expect(result.totalCommission.toNumber()).toBe(88);
        });

        it('should apply quality bonuses correctly (rating + on-time)', () => {
            const input: CommissionCalculationInput = {
                orderAmount: CommissionAmount.fromNumber(1000),
                recipientType: RecipientType.SELLER,
                commissionType: CommissionType.SALE,
                qualityMetrics: {
                    rating: 4.9, // +5%
                    onTimeDelivery: true // +5%
                }
            };

            const result = CommissionCalculationEngine.calculateCommission(input);

            // Base = 80. Quality Multiplier = 0.05 + 0.05 = 0.1
            expect(result.breakdown.qualityBonus.toNumber()).toBe(8);
            expect(result.totalCommission.toNumber()).toBe(88);
        });

        it('should apply additional perfect rating bonus (5.0)', () => {
            const input: CommissionCalculationInput = {
                orderAmount: CommissionAmount.fromNumber(1000),
                recipientType: RecipientType.SELLER,
                commissionType: CommissionType.SALE,
                qualityMetrics: {
                    rating: 5.0 // +5% (>=4.8) +5% (==5.0) = 10%
                }
            };

            const result = CommissionCalculationEngine.calculateCommission(input);

            expect(result.breakdown.qualityBonus.toNumber()).toBe(8);
        });

        it('should apply special bonuses (first order + bulk + promo)', () => {
            const input: CommissionCalculationInput = {
                orderAmount: CommissionAmount.fromNumber(2000),
                recipientType: RecipientType.SELLER,
                commissionType: CommissionType.SALE,
                specialConditions: {
                    firstOrder: true, // +50
                    bulkOrder: true, // +2% of 2000 = 40
                    promotionalPeriod: true // +1% of 2000 = 20
                }
            };

            const result = CommissionCalculationEngine.calculateCommission(input);

            expect(result.breakdown.specialBonus.toNumber()).toBe(110);
        });

        it('should use custom base rate if provided', () => {
            const input: CommissionCalculationInput = {
                orderAmount: CommissionAmount.fromNumber(1000),
                recipientType: RecipientType.SELLER,
                commissionType: CommissionType.SALE,
                baseRate: CommissionRate.fromPercentage(12)
            };

            const result = CommissionCalculationEngine.calculateCommission(input);

            expect(result.baseCommission.toNumber()).toBe(120);
            expect(result.appliedRate.toNumber()).toBe(0.12);
        });

        it('should calculate enabler task commission correctly', () => {
            const input: CommissionCalculationInput = {
                orderAmount: CommissionAmount.fromNumber(1000),
                recipientType: RecipientType.ENABLER,
                commissionType: CommissionType.TASK_COMPLETION
            };

            const result = CommissionCalculationEngine.calculateCommission(input);

            expect(result.baseCommission.toNumber()).toBe(200); // 20%
        });
    });

    describe('calculateRewardAmount', () => {
        it('should calculate customer referral reward (10%)', () => {
            const baseAmount = CommissionAmount.fromNumber(100);
            const reward = CommissionCalculationEngine.calculateRewardAmount(
                RewardType.REFERRAL,
                baseAmount,
                RecipientType.CUSTOMER
            );

            expect(reward.toNumber()).toBe(10);
        });

        it('should calculate seller milestone reward (10%)', () => {
            const baseAmount = CommissionAmount.fromNumber(1000);
            const reward = CommissionCalculationEngine.calculateRewardAmount(
                RewardType.MILESTONE,
                baseAmount,
                RecipientType.SELLER
            );

            expect(reward.toNumber()).toBe(100);
        });
    });
});
