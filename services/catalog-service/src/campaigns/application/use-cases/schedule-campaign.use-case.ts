import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { CampaignDto } from '../dto/campaign.dto';
import { CampaignNotFoundError } from '../../domain/errors/campaign.errors';
import { CampaignMapper } from '../mappers/campaign.mapper';

@injectable()
export class ScheduleCampaignUseCase {
    constructor(
        @inject(TYPES.CampaignRepository)
        private readonly campaignRepository: ICampaignRepository
    ) { }

    async execute(id: string): Promise<CampaignDto> {
        const campaign = await this.campaignRepository.findById(id);
        if (!campaign) throw new CampaignNotFoundError(id);

        campaign.schedule_campaign();
        await this.campaignRepository.save(campaign);

        return CampaignMapper.toDto(campaign);
    }
}
