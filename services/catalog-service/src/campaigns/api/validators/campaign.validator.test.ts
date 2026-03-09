jest.mock('../../domain/enums', () => ({
  CampaignType: {
    FLASH_SALE: 'FLASH_SALE',
    DISCOUNT: 'DISCOUNT',
    BUNDLE: 'BUNDLE',
    SEASONAL: 'SEASONAL',
    PROMOTIONAL: 'PROMOTIONAL'
  },
  RuleType: {
    FIXED_DISCOUNT: 'FIXED_DISCOUNT',
    PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT'
  },
  ConditionType: {
    MIN_ORDER_VALUE: 'MIN_ORDER_VALUE',
    CUSTOMER_SEGMENT: 'CUSTOMER_SEGMENT'
  },
  OperatorType: {
    EQUALS: 'EQUALS',
    GREATER_THAN: 'GREATER_THAN'
  }
}));

import {
  CampaignConditionSchema,
  CampaignPricingRuleSchema,
  CreateCampaignSchema,
  UpdateCampaignSchema
} from './campaign.validator';

describe('campaign.validator', () => {
  it('parses valid pricing rule and condition payloads', () => {
    const rule = CampaignPricingRuleSchema.parse({
      type: 'PERCENTAGE_DISCOUNT',
      value: 15
    });
    const condition = CampaignConditionSchema.parse({
      type: 'MIN_ORDER_VALUE',
      operator: 'GREATER_THAN',
      value: 50000
    });

    expect(rule.priority).toBe(0);
    expect(condition.type).toBe('MIN_ORDER_VALUE');
  });

  it('parses valid create and update campaign payloads', () => {
    const parsed = CreateCampaignSchema.parse({
      name: 'Weekend Flash Sale',
      type: 'FLASH_SALE',
      startDate: '2026-03-10T00:00:00.000Z',
      endDate: '2026-03-12T00:00:00.000Z',
      pricingRules: [{ type: 'FIXED_DISCOUNT', value: 1000 }]
    });
    const update = UpdateCampaignSchema.parse({
      description: 'Updated campaign description'
    });

    expect(parsed.timezone).toBe('UTC');
    expect(update.description).toContain('Updated');
  });

  it('rejects invalid create campaign payloads', () => {
    expect(() =>
      CreateCampaignSchema.parse({
        name: 'x',
        type: 'FLASH_SALE',
        startDate: 'invalid-date',
        endDate: '2026-03-12T00:00:00.000Z',
        pricingRules: []
      })
    ).toThrow();
  });
});
