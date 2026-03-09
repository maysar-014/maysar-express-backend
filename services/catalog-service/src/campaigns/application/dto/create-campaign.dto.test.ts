import {
  CampaignType,
  ConditionType,
  RuleType
} from '../../domain/types/campaign.types';
import type {
  CreateCampaignDto,
  CreateConditionDto,
  CreatePricingRuleDto
} from './create-campaign.dto';

describe('create-campaign DTO contracts', () => {
  it('supports pricing rule and condition payloads', () => {
    const rule: CreatePricingRuleDto = {
      type: RuleType.PERCENTAGE_DISCOUNT,
      value: 15,
      priority: 1
    };
    const condition: CreateConditionDto = {
      type: ConditionType.MIN_ORDER_VALUE,
      operator: 'GREATER_THAN',
      value: 50000
    };

    expect(rule.type).toBe(RuleType.PERCENTAGE_DISCOUNT);
    expect(condition.type).toBe(ConditionType.MIN_ORDER_VALUE);
  });

  it('supports create campaign payload shape', () => {
    const dto: CreateCampaignDto = {
      name: 'Weekend Promo',
      description: 'Boost weekend conversion',
      type: CampaignType.PROMOTION,
      startDate: new Date('2026-03-15T00:00:00.000Z'),
      endDate: new Date('2026-03-20T00:00:00.000Z'),
      timezone: 'Africa/Dar_es_Salaam',
      pricingRules: [{ type: RuleType.FIXED_DISCOUNT, value: 5000 }],
      conditions: [{ type: ConditionType.CUSTOMER_SEGMENT, operator: 'EQUALS', value: 'VIP' }],
      productIds: ['p-1']
    };

    expect(dto.name).toBe('Weekend Promo');
    expect(dto.pricingRules).toHaveLength(1);
  });
});
