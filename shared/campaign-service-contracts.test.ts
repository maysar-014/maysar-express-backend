import type { CampaignService } from '../shared-contracts/campaign-service-contracts';

describe('campaign-service contracts', () => {
  it('exposes campaign event and command shapes via backward-compatible alias', () => {
    const started: CampaignService.Events.CampaignStarted = {
      campaignId: 'camp-1',
      name: 'Ramadan Promo',
      startedAt: new Date('2026-03-01T00:00:00.000Z')
    };
    const endCommand: CampaignService.Commands.EndCampaign = {
      campaignId: 'camp-1',
      reason: 'budget-exhausted'
    };

    expect(started.campaignId).toBe('camp-1');
    expect(endCommand.reason).toBe('budget-exhausted');
  });
});
