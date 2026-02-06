import { PricingRule } from './pricing-rule.entity';
import { Money } from '../value-objects/money.value-object';

export class PriceConfiguration {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly rules: PricingRule[],
        public readonly isActive: boolean = true
    ) { }

    calculateFinalPrice(basePrice: Money): Money {
        let finalPrice = basePrice;

        // Sort rules by priority
        const sortedRules = [...this.rules]
            .filter(r => r.isActive)
            .sort((a, b) => b.priority - a.priority);

        for (const rule of sortedRules) {
            const adjustment = rule.calculate(basePrice);
            finalPrice = finalPrice.add(adjustment);
        }

        return finalPrice;
    }
}
