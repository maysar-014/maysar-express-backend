import {
  CampaignStatus,
  CampaignType,
  ConditionType,
  RuleType
} from '../../domain/types/campaign.types';
import type {
  CampaignConditionDto,
  CampaignDto,
  CampaignMetricsDto,
  PricingRuleDto
} from './campaign.dto';

describe('campaign DTO contracts', () => {
  it('supports pricing rule and condition payloads', () => {
    const rule: PricingRuleDto = {
      id: 'rule-1',
      type: RuleType.FIXED_DISCOUNT,
      value: 3000,
      priority: 1
    };
    const condition: CampaignConditionDto = {
      id: 'cond-1',
      type: ConditionType.MIN_ORDER_VALUE,
      operator: 'GREATER_THAN',
      value: 20000
    };

    expect(rule.type).toBe(RuleType.FIXED_DISCOUNT);
    expect(condition.operator).toBe('GREATER_THAN');
  });

  it('supports campaign and metrics response payloads', () => {
    const campaign: CampaignDto = {
      id: 'camp-1',
      name: 'Ramadan Bundle',
      type: CampaignType.SEASONAL,
      status: CampaignStatus.ACTIVE,
      startDate: new Date('2026-03-01T00:00:00.000Z'),
      timezone: 'UTC',
      sellerId: 'seller-1',
      createdBy: 'admin-1',
      pricingRules: [],
      conditions: [],
      productIds: [],
      categoryIds: [],
      createdAt: new Date('2026-02-20T00:00:00.000Z'),
      updatedAt: new Date('2026-02-21T00:00:00.000Z')
    };
    const metrics: CampaignMetricsDto = {
      campaignId: 'camp-1',
      views: 500,
      conversions: 42,
      revenue: 1200000,
      totalProductsAffected: 12,
      totalRevenueImpact: 140000,
      averageDiscountPercent: 9.5
    };

    expect(campaign.status).toBe(CampaignStatus.ACTIVE);
    expect(metrics.conversions).toBe(42);
  });
});
