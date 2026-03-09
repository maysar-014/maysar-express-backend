import { CampaignStatus } from '../types/campaign.types';
import { CampaignValidationError } from '../errors/campaign.errors';
import { CampaignValidationPolicy } from './campaign-validation.policy';

const futureDate = () => new Date(Date.now() + 60_000);
const pastDate = () => new Date(Date.now() - 60_000);

const makeCampaign = (overrides: Record<string, unknown> = {}) =>
  ({
    getPricingRules: () => [{ id: 'rule-1' }],
    getProductIds: () => ['prod-1'],
    getCategoryIds: () => [],
    getStatus: () => CampaignStatus.DRAFT,
    getSchedule: () => ({ getStartDate: futureDate }),
    ...overrides
  }) as never;

describe('CampaignValidationPolicy', () => {
  it('throws when campaign has no pricing rules for launch', () => {
    const policy = new CampaignValidationPolicy();
    const campaign = makeCampaign({ getPricingRules: () => [] });

    expect(() => policy.validateLaunch(campaign)).toThrow(CampaignValidationError);
  });

  it('throws when campaign has no product or category targets for launch', () => {
    const policy = new CampaignValidationPolicy();
    const campaign = makeCampaign({
      getProductIds: () => [],
      getCategoryIds: () => []
    });

    expect(() => policy.validateLaunch(campaign)).toThrow(CampaignValidationError);
  });

  it('throws when campaign status is CANCELLED or COMPLETED', () => {
    const policy = new CampaignValidationPolicy();
    const cancelled = makeCampaign({ getStatus: () => CampaignStatus.CANCELLED });
    const completed = makeCampaign({ getStatus: () => CampaignStatus.COMPLETED });

    expect(() => policy.validateLaunch(cancelled)).toThrow(CampaignValidationError);
    expect(() => policy.validateLaunch(completed)).toThrow(CampaignValidationError);
  });

  it('does not throw for a valid launch configuration', () => {
    const policy = new CampaignValidationPolicy();
    const campaign = makeCampaign();

    expect(() => policy.validateLaunch(campaign)).not.toThrow();
  });

  it('throws when schedule start date is in the past', () => {
    const policy = new CampaignValidationPolicy();
    const campaign = makeCampaign({
      getSchedule: () => ({ getStartDate: pastDate })
    });

    expect(() => policy.validateScheduling(campaign)).toThrow(CampaignValidationError);
  });

  it('does not throw when schedule start date is in the future', () => {
    const policy = new CampaignValidationPolicy();
    const campaign = makeCampaign({
      getSchedule: () => ({ getStartDate: futureDate })
    });

    expect(() => policy.validateScheduling(campaign)).not.toThrow();
  });
});
