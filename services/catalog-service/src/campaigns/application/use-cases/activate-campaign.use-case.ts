type ActivatableCampaign = {
    status: string;
    [key: string]: unknown;
};

interface CampaignActivatorRepository {
    findById(id: string): Promise<ActivatableCampaign | null>;
    update(campaign: ActivatableCampaign): Promise<void>;
}

interface CampaignEventBus {
    publish(eventName: string, payload: ActivatableCampaign): Promise<void>;
}

export class ActivateCampaignUseCase {
    constructor(
        private readonly repository: CampaignActivatorRepository,
        private readonly eventBus: CampaignEventBus
    ) {}

    async execute(dto: { campaignId: string }) {
        const campaign = await this.repository.findById(dto.campaignId);
        if (!campaign) throw new Error('Campaign not found');
        if (campaign.status === 'ACTIVE') throw new Error('Campaign already active');

        campaign.status = 'ACTIVE';
        await this.repository.update(campaign);
        await this.eventBus.publish('CampaignActivated.v1', campaign);
        return campaign;
    }
}
