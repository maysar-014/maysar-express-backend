import { RuleType } from '../types/campaign.types';
import { PricingRuleValue } from '../value-objects/pricing-rule-value.value-object';
import { CampaignPricingRule } from './campaign-pricing-rule.entity';

describe('CampaignPricingRule', () => {
  it('exposes getters and delegates pricing calculations', () => {
    const ruleValue = PricingRuleValue.create(RuleType.PERCENTAGE_DISCOUNT, 10);
    const createdAt = new Date('2026-03-09T10:00:00.000Z');
    const rule = new CampaignPricingRule(
      'rule-1',
      ruleValue,
      3,
      { channel: 'MOBILE' },
      createdAt
    );

    expect(rule.getId()).toBe('rule-1');
    expect(rule.getRuleValue()).toBe(ruleValue);
    expect(rule.getPriority()).toBe(3);
    expect(rule.getConditions()).toEqual({ channel: 'MOBILE' });
    expect(rule.getCreatedAt()).toBe(createdAt);
    expect(rule.calculateDiscount(200)).toBe(20);
    expect(rule.apply(200)).toBe(180);
  });

  it('creates rule via static factory with defaults', () => {
    const ruleValue = PricingRuleValue.create(RuleType.FIXED_DISCOUNT, 50);
    const rule = CampaignPricingRule.create('rule-2', ruleValue);

    expect(rule.getPriority()).toBe(0);
    expect(rule.getConditions()).toEqual({});
    expect(rule.apply(100)).toBe(50);
  });
});

