import { CampaignMapper } from './campaign.mapper';
import { Campaign } from '../../domain/entities/campaign.entity';
import { CampaignCondition } from '../../domain/entities/campaign-condition.entity';
import { CampaignPricingRule } from '../../domain/entities/campaign-pricing-rule.entity';
import { CampaignMetadata } from '../../domain/value-objects/campaign-metadata.value-object';
import { CampaignSchedule } from '../../domain/value-objects/campaign-schedule.value-object';
import { PricingRuleValue } from '../../domain/value-objects/pricing-rule-value.value-object';
import {
  CampaignStatus,
  CampaignType,
  ConditionType,
  RuleType
} from '../../domain/types/campaign.types';

describe('campaign.mapper', () => {
  it('maps a campaign entity to dto and persistence models', () => {
    const schedule = CampaignSchedule.create(
      new Date('2026-03-10T00:00:00.000Z'),
      new Date('2026-03-20T00:00:00.000Z'),
      'UTC'
    );
    const metadata = CampaignMetadata.create({ source: 'tests' });
    const campaign = Campaign.create(
      'camp-1',
      'Flash Sale',
      CampaignType.DISCOUNT,
      schedule,
      'seller-1',
      'admin-1',
      'fast sale',
      metadata
    );

    const rule = CampaignPricingRule.create(
      'rule-1',
      PricingRuleValue.create(RuleType.PERCENTAGE_DISCOUNT, 20),
      1,
      { minOrderValue: 100 }
    );
    const condition = CampaignCondition.create(
      'cond-1',
      ConditionType.MIN_ORDER_VALUE,
      'GREATER_THAN',
      100
    );

    campaign.addPricingRule(rule);
    campaign.addCondition(condition);
    campaign.addProduct('prod-1');
    campaign.addCategory('cat-1');

    const dto = CampaignMapper.toDto(campaign);
    const persistence = CampaignMapper.toPersistence(campaign);

    expect(dto.id).toBe('camp-1');
    expect(dto.pricingRules).toHaveLength(1);
    expect(dto.conditions).toHaveLength(1);
    expect(dto.productIds).toEqual(['prod-1']);
    expect(dto.categoryIds).toEqual(['cat-1']);
    expect(persistence.pricingRules.create[0]).toMatchObject({
      id: 'rule-1',
      ruleType: RuleType.PERCENTAGE_DISCOUNT,
      value: 20
    });
    expect(persistence.conditions.create[0]).toMatchObject({
      id: 'cond-1',
      type: ConditionType.MIN_ORDER_VALUE,
      operator: 'GREATER_THAN'
    });
  });

  it('reconstitutes campaign domain entity from persistence record', () => {
    const record = {
      id: 'camp-2',
      name: 'Seasonal Campaign',
      description: 'yearly campaign',
      type: CampaignType.SEASONAL,
      status: CampaignStatus.SCHEDULED,
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2026-04-15T00:00:00.000Z'),
      timezone: 'UTC',
      sellerId: 'seller-2',
      createdBy: 'admin-2',
      metadata: { source: 'import' },
        pricingRules: [
        {
          id: 'rule-2',
          ruleType: RuleType.FIXED_DISCOUNT,
          value: 15,
          priority: 2,
          conditions: { maxUses: 10 }
        }
      ],
      conditions: [
        {
          id: 'cond-2',
          type: ConditionType.GEOGRAPHIC_REGION,
          operator: 'IN',
          value: ['TZ']
        }
      ],
      products: [{ productId: 'prod-2' }],
      categories: [{ categoryId: 'cat-2' }],
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-05T00:00:00.000Z')
    };

    const campaign = CampaignMapper.toDomain(record);

    expect(campaign.getId()).toBe('camp-2');
    expect(campaign.getType()).toBe(CampaignType.SEASONAL);
    expect(campaign.getStatus()).toBe(CampaignStatus.SCHEDULED);
    expect(campaign.getPricingRules()).toHaveLength(1);
    expect(campaign.getConditions()).toHaveLength(1);
    expect(campaign.getProductIds()).toEqual(['prod-2']);
    expect(campaign.getCategoryIds()).toEqual(['cat-2']);
  });
});
