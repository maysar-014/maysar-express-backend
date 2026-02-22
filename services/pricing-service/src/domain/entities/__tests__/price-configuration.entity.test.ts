import { PriceConfiguration } from '../price-configuration.entity';
import { PricingRule, PricingRuleType } from '../pricing-rule.entity';
import { Money } from '../../value-objects/money.value-object';

describe('PriceConfiguration', () => {
    const basePrice = new Money(100, 'USD');

    const flatFee = new PricingRule('r1', 'Fee', PricingRuleType.FLAT, 5, 1); // +5
    const tax = new PricingRule('r2', 'Tax', PricingRuleType.PERCENTAGE, 10, 2); // +10%
    const discount = new PricingRule('r3', 'Discount', PricingRuleType.FLAT, -10, 3); // -10

    // Priority: Discount(3) > Tax(2) > Fee(1)

    // Logic in PriceConfiguration:
    // Sort by priority DESC (3, 2, 1)
    // Loop: finalPrice = finalPrice.add(rule.calculate(basePrice));
    // Wait, rule.calculate uses 'basePrice' passed to it? 
    // rules loop: const adjustment = rule.calculate(basePrice); 
    // It uses the ORIGINAL basePrice for calculation every time?
    // Let's check source again.
    // "const adjustment = rule.calculate(basePrice);" -> Yes, it passes the input arg `basePrice`.
    // So all percentages are based on the original price, not the running total.

    describe('calculateFinalPrice', () => {
        it('should apply rules in order', () => {
            const config = new PriceConfiguration('c1', 'Config', [flatFee, tax, discount]);

            const final = config.calculateFinalPrice(basePrice);

            // Discount: -10 (flat)
            // Tax: +10 (10% of 100)
            // Fee: +5 (flat)
            // Total adjustment: -10 + 10 + 5 = +5
            // Final: 100 + 5 = 105

            expect(final.amount).toBe(105);
        });

        it('should ignore inactive rules', () => {
            const inactiveRule = new PricingRule('r4', 'Inactive', PricingRuleType.FLAT, 100, 10, false);
            const config = new PriceConfiguration('c2', 'Config', [flatFee, inactiveRule]);

            const final = config.calculateFinalPrice(basePrice);
            // Only flatFee (+5)
            expect(final.amount).toBe(105);
        });

        it('should handle empty rules', () => {
            const config = new PriceConfiguration('c3', 'Empty', []);
            const final = config.calculateFinalPrice(basePrice);
            expect(final.amount).toBe(100);
        });
    });
});
