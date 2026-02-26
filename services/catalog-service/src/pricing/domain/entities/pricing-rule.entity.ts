import { Money } from '../value-objects/money.value-object';

export enum PricingRuleType {
    FLAT = 'FLAT',
    PERCENTAGE = 'PERCENTAGE',
    TIERED = 'TIERED'
}

export class PricingRule {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly type: PricingRuleType,
        public readonly value: number,
        public readonly priority: number,
        public readonly isActive: boolean = true
    ) { }

    calculate(basePrice: Money): Money {
        switch (this.type) {
            case PricingRuleType.FLAT:
                return new Money(this.value, basePrice.currency);
            case PricingRuleType.PERCENTAGE:
                return basePrice.multiply(this.value / 100);
            default:
                return new Money(0, basePrice.currency);
        }
    }
}
