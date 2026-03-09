import {
  CampaignError,
  CampaignNotFoundError,
  CampaignValidationError,
  InvalidScheduleError,
  PricingRuleError
} from './campaign.errors';

describe('campaign.errors', () => {
  it('creates base campaign error with default code', () => {
    const error = new CampaignError('base error');

    expect(error.message).toBe('base error');
    expect(error.code).toBe('CAMPAIGN_ERROR');
    expect(error.name).toBe('CampaignError');
  });

  it('creates specific campaign errors with expected names and codes', () => {
    const notFound = new CampaignNotFoundError('cmp-1');
    const validation = new CampaignValidationError('invalid data');
    const invalidSchedule = new InvalidScheduleError('start after end');
    const pricingRule = new PricingRuleError('rule conflict');

    expect(notFound.message).toBe('Campaign with ID cmp-1 not found');
    expect(notFound.code).toBe('CAMPAIGN_NOT_FOUND');
    expect(notFound.name).toBe('CampaignNotFoundError');

    expect(validation.code).toBe('CAMPAIGN_VALIDATION_ERROR');
    expect(validation.name).toBe('CampaignValidationError');

    expect(invalidSchedule.code).toBe('INVALID_SCHEDULE_ERROR');
    expect(invalidSchedule.name).toBe('InvalidScheduleError');

    expect(pricingRule.code).toBe('PRICING_RULE_ERROR');
    expect(pricingRule.name).toBe('PricingRuleError');
  });
});

