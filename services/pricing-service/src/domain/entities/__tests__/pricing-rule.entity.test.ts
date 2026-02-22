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
            expect(result.amount).toBe(110); // Wait, logic in entity says: return new Money(this.value, basePrice.currency);
            // Ah, looking at source:
            // case PricingRuleType.FLAT: return new Money(this.value, basePrice.currency);
            // It returns the ADJUSTMENT amount, not the final price?
            // "calculate(basePrice): Money"

            // Let's re-read source:
            // case PricingRuleType.FLAT: return new Money(this.value, basePrice.currency);
            // case PricingRuleType.PERCENTAGE: return basePrice.multiply(this.value / 100);

            // It seems `calculate` returns the adjustment value.
            // But in PriceConfiguration: finalPrice = finalPrice.add(adjustment);
            // So if it's a discount, the value should be negative? Or is it an surcharge?
            // The entity source logic:
            // finalPrice = finalPrice.add(adjustment);

            // If I want a discount, PricingRule value should probably be negative for FLAT.
            // For PERCENTAGE, multiply(value/100). If value is -10, it returns -10% of base.

            // Let's assume the rule value dictates sign.

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
