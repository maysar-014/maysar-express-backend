import { PricingRuleValue } from '../value-objects/pricing-rule-value.value-object';

export class CampaignPricingRule {
    constructor(
        private readonly id: string,
        private readonly ruleValue: PricingRuleValue,
        private readonly priority: number = 0,
        private readonly conditions: Record<string, unknown> = {},
        private readonly createdAt: Date = new Date()
    ) { }

    getId(): string {
        return this.id;
    }

    getRuleValue(): PricingRuleValue {
        return this.ruleValue;
    }

    getPriority(): number {
        return this.priority;
    }

    getConditions(): Record<string, unknown> {
        return { ...this.conditions };
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    calculateDiscount(originalPrice: number): number {
        return this.ruleValue.calculateDiscount(originalPrice);
    }

    apply(originalPrice: number): number {
        return this.ruleValue.apply(originalPrice);
    }

    static create(id: string, ruleValue: PricingRuleValue, priority?: number, conditions?: Record<string, unknown>): CampaignPricingRule {
        return new CampaignPricingRule(id, ruleValue, priority, conditions);
    }
}
