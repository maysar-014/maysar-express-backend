import { PricingRuleError } from '../errors/campaign.errors';
import { RuleType } from '../types/campaign.types';
import { PricingRuleValue } from './pricing-rule-value.value-object';

describe('PricingRuleValue', () => {
  it('validates constructor inputs', () => {
    expect(() => new PricingRuleValue(RuleType.FIXED_DISCOUNT, -1)).toThrow(PricingRuleError);
    expect(() => new PricingRuleValue(RuleType.PERCENTAGE_DISCOUNT, 101)).toThrow(
      'Percentage discount cannot exceed 100%'
    );
  });

  it('calculates discount by rule type', () => {
    const fixed = new PricingRuleValue(RuleType.FIXED_DISCOUNT, 40);
    const percent = new PricingRuleValue(RuleType.PERCENTAGE_DISCOUNT, 10);
    const fixedPrice = new PricingRuleValue(RuleType.FIXED_PRICE, 120);

    expect(fixed.calculateDiscount(100)).toBe(40);
    expect(new PricingRuleValue(RuleType.FIXED_DISCOUNT, 500).calculateDiscount(100)).toBe(100);
    expect(percent.calculateDiscount(200)).toBe(20);
    expect(fixedPrice.calculateDiscount(100)).toBe(0);
  });

  it('applies rule type to final price', () => {
    const fixed = new PricingRuleValue(RuleType.FIXED_DISCOUNT, 25);
    const percent = new PricingRuleValue(RuleType.PERCENTAGE_DISCOUNT, 20);
    const fixedPrice = new PricingRuleValue(RuleType.FIXED_PRICE, 90);

    expect(fixed.apply(100)).toBe(75);
    expect(percent.apply(100)).toBe(80);
    expect(fixedPrice.apply(100)).toBe(90);
  });

  it('creates value object via static create with getters', () => {
    const value = PricingRuleValue.create(RuleType.FIXED_DISCOUNT, 15);

    expect(value.getType()).toBe(RuleType.FIXED_DISCOUNT);
    expect(value.getValue()).toBe(15);
  });
});
