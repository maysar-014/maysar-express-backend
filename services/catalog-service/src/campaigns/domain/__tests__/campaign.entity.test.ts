import { Campaign } from '../campaign.entity';
import { CampaignType, CampaignStatus } from '../../enums';
import { CampaignSchedule } from '../../value-objects/campaign-schedule.value-object';
import { CampaignMetadata } from '../../value-objects/campaign-metadata.value-object';

describe('Campaign Entity', () => {
    const validStartDate = new Date(Date.now() + 86400000); // tomorrow
    const validEndDate = new Date(Date.now() + 172800000); // day after tomorrow
    const schedule = CampaignSchedule.create(validStartDate, validEndDate, 'UTC');
    const metadata = CampaignMetadata.create({ key: 'value' });

    it('should create a campaign correctly', () => {
        const campaign = Campaign.create(
            'Test Campaign',
            'Test Description',
            CampaignType.PERCENTAGE_DISCOUNT,
            schedule,
            'seller-123',
            'user-123',
            metadata
        );

        expect(campaign.getName()).toBe('Test Campaign');
        expect(campaign.getStatus()).toBe(CampaignStatus.DRAFT);
        expect(campaign.getSellerId()).toBe('seller-123');
    });

    it('should transition from DRAFT to SCHEDULED when launched with future date', () => {
        const campaign = Campaign.create(
            'Test Campaign',
            'Test Description',
            CampaignType.PERCENTAGE_DISCOUNT,
            schedule,
            'seller-123',
            'user-123',
            metadata
        );

        campaign.launch();
        expect(campaign.getStatus()).toBe(CampaignStatus.SCHEDULED);
    });

    it('should transition to ACTIVE when launched with current date', () => {
        const now = new Date();
        const activeSchedule = CampaignSchedule.create(now, validEndDate, 'UTC');
        const campaign = Campaign.create(
            'Test Campaign',
            'Test Description',
            CampaignType.PERCENTAGE_DISCOUNT,
            activeSchedule,
            'seller-123',
            'user-123',
            metadata
        );

        campaign.launch();
        expect(campaign.getStatus()).toBe(CampaignStatus.ACTIVE);
    });

    it('should allow pausing an active campaign', () => {
        const now = new Date();
        const activeSchedule = CampaignSchedule.create(now, validEndDate, 'UTC');
        const campaign = Campaign.create(
            'Test Campaign',
            'Test Description',
            CampaignType.PERCENTAGE_DISCOUNT,
            activeSchedule,
            'seller-123',
            'user-123',
            metadata
        );

        campaign.launch();
        campaign.pause();
        expect(campaign.getStatus()).toBe(CampaignStatus.PAUSED);
    });

    it('should allow canceling a campaign', () => {
        const campaign = Campaign.create(
            'Test Campaign',
            'Test Description',
            CampaignType.PERCENTAGE_DISCOUNT,
            schedule,
            'seller-123',
            'user-123',
            metadata
        );

        campaign.cancel();
        expect(campaign.getStatus()).toBe(CampaignStatus.CANCELLED);
    });
});
