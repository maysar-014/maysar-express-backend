import { RuleType } from '../types/campaign.types';
import { PricingRuleError } from '../errors/campaign.errors';

export class PricingRuleValue {
    constructor(
        private readonly type: RuleType,
        private readonly value: number
    ) {
        this.validate();
    }

    private validate(): void {
        if (this.value < 0) {
            throw new PricingRuleError('Pricing rule value cannot be negative');
        }

        if (this.type === RuleType.PERCENTAGE_DISCOUNT && this.value > 100) {
            throw new PricingRuleError('Percentage discount cannot exceed 100%');
        }
    }

    getType(): RuleType {
        return this.type;
    }

    getValue(): number {
        return this.value;
    }

    calculateDiscount(originalPrice: number): number {
        switch (this.type) {
            case RuleType.FIXED_DISCOUNT:
                return Math.min(this.value, originalPrice);
            case RuleType.PERCENTAGE_DISCOUNT:
                return (originalPrice * this.value) / 100;
            case RuleType.FIXED_PRICE:
                return Math.max(0, originalPrice - this.value);
            default:
                return 0;
        }
    }

    apply(originalPrice: number): number {
        switch (this.type) {
            case RuleType.FIXED_DISCOUNT:
                return Math.max(0, originalPrice - this.value);
            case RuleType.PERCENTAGE_DISCOUNT:
                return originalPrice * (1 - this.value / 100);
            case RuleType.FIXED_PRICE:
                return this.value;
            default:
                return originalPrice;
        }
    }

    static create(type: RuleType, value: number): PricingRuleValue {
        return new PricingRuleValue(type, value);
    }
}
