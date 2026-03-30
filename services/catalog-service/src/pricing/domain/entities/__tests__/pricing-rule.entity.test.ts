import { PricingRule, PricingRuleType } from '../pricing-rule.entity';
import { Money } from '../../value-objects/money.value-object';

describe('PricingRule', () => {
    const basePrice = new Money(100, 'USD');

    describe('creation', () => {
        it('should create valid rule', () => {
            const rule = new PricingRule('rule-1', 'Flat Discount', PricingRuleType.FLAT, 10, 1);
            expect(rule.id).toBe('rule-1');
            expect(rule.isActive).toBe(true);
        });
    });

    describe('calculate', () => {
        it('should calculate flat discount', () => {
            const rule = new PricingRule('rule-1', 'Flat', PricingRuleType.FLAT, 10, 1);
            const result = rule.calculate(basePrice);
            expect(result.amount).toBe(10);
            expect(result.currency).toBe('USD');
        });

        it('should calculate percentage discount', () => {
            const rule = new PricingRule('rule-2', 'Percent', PricingRuleType.PERCENTAGE, 10, 1);
            const result = rule.calculate(basePrice);
            // 10% of 100 = 10
            expect(result.amount).toBe(10);
        });

        it('should return zero for unknown type', () => {
            const rule = new PricingRule('rule-3', 'Unknown', 'UNKNOWN' as any, 10, 1);
            const result = rule.calculate(basePrice);
            expect(result.amount).toBe(0);
        });
    });
});
