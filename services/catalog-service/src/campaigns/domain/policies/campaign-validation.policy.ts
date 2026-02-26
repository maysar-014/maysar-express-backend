import { Campaign } from '../entities/campaign.entity';
import { CampaignValidationError } from '../errors/campaign.errors';
import { CampaignStatus } from '../types/campaign.types';

export class CampaignValidationPolicy {
    validateLaunch(campaign: Campaign): void {
        if (campaign.getPricingRules().length === 0) {
            throw new CampaignValidationError('Campaign must have at least one pricing rule before launching');
        }

        if (campaign.getProductIds().length === 0 && campaign.getCategoryIds().length === 0) {
            throw new CampaignValidationError('Campaign must be applied to at least one product or category before launching');
        }

        if (campaign.getStatus() === CampaignStatus.CANCELLED || campaign.getStatus() === CampaignStatus.COMPLETED) {
            throw new CampaignValidationError('Cannot launch a cancelled or completed campaign');
        }
    }

    validateScheduling(campaign: Campaign): void {
        const startDate = campaign.getSchedule().getStartDate();
        if (startDate < new Date()) {
            throw new CampaignValidationError('Campaign start date must be in the future for scheduling');
        }
    }
}
