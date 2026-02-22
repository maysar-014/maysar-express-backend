export class ActivateCampaignUseCase {
    constructor(
        private readonly repository: any,
        private readonly eventBus: any
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
