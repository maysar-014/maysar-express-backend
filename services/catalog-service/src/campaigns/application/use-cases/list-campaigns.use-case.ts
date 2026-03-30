import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { CampaignDto } from '../dto/campaign.dto';
import { CampaignMapper } from '../mappers/campaign.mapper';

@injectable()
export class ListCampaignsUseCase {
    constructor(
        @inject(TYPES.CampaignRepository)
        private readonly campaignRepository: ICampaignRepository
    ) { }

    async execute(filters?: Record<string, unknown>): Promise<CampaignDto[]> {
        const campaigns = await this.campaignRepository.findAll(filters);
        return campaigns.map(campaign => CampaignMapper.toDto(campaign));
    }
}
