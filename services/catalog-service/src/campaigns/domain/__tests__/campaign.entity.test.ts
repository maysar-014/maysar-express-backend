import { Campaign } from '../campaign.entity';
import { CampaignStatus, CampaignType } from '../enums';

describe('Campaign Entity', () => {
    it('creates a campaign with constructor values', () => {
        const startDate = new Date(Date.now() + 60_000);
        const endDate = new Date(Date.now() + 120_000);

        const campaign = new Campaign(
            'cmp-1',
            'Launch Promo',
            CampaignType.PROMOTIONAL,
            CampaignStatus.DRAFT,
            startDate,
            endDate
        );

        expect(campaign.id).toBe('cmp-1');
        expect(campaign.name).toBe('Launch Promo');
        expect(campaign.status).toBe(CampaignStatus.DRAFT);
        expect(campaign.type).toBe(CampaignType.PROMOTIONAL);
    });

    it('allows direct status transitions used by services', () => {
        const campaign = new Campaign(
            'cmp-2',
            'Flash Discount',
            CampaignType.FLASH_SALE,
            CampaignStatus.DRAFT,
            new Date(),
            new Date(Date.now() + 3_600_000)
        );

        campaign.status = CampaignStatus.ACTIVE;
        expect(campaign.status).toBe(CampaignStatus.ACTIVE);

        campaign.status = CampaignStatus.PAUSED;
        expect(campaign.status).toBe(CampaignStatus.PAUSED);
    });
});
