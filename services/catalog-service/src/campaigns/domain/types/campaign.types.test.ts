import {
  CampaignStatus,
  CampaignType,
  ConditionType,
  ICampaignMetadata,
  OperatorType,
  RuleType
} from './campaign.types';

describe('campaign types', () => {
  it('exposes campaign enums and expected string values', () => {
    expect(CampaignType.DISCOUNT).toBe('DISCOUNT');
    expect(CampaignType.SEASONAL).toBe('SEASONAL');
    expect(CampaignStatus.DRAFT).toBe('DRAFT');
    expect(CampaignStatus.ACTIVE).toBe('ACTIVE');
    expect(RuleType.PERCENTAGE_DISCOUNT).toBe('PERCENTAGE_DISCOUNT');
    expect(ConditionType.GEOGRAPHIC_REGION).toBe('GEOGRAPHIC_REGION');
    expect(OperatorType.CONTAINS).toBe('CONTAINS');
  });

  it('supports metadata dictionary contract', () => {
    const metadata: ICampaignMetadata = {
      budget: 50000,
      targetSegment: 'new_users',
      notes: 'Q1 launch'
    };

    expect(metadata.budget).toBe(50000);
    expect(metadata.targetSegment).toBe('new_users');
  });
});
