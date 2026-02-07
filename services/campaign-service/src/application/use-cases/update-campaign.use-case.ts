import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { CampaignDto } from '../dto/campaign.dto';
import { CampaignNotFoundError, CampaignValidationError } from '../../domain/errors/campaign.errors';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { CampaignStatus } from '../../domain/types/campaign.types';

@injectable()
export class UpdateCampaignUseCase {
    constructor(
        @inject(TYPES.CampaignRepository)
        private readonly campaignRepository: ICampaignRepository
    ) { }

    async execute(id: string, updates: any): Promise<CampaignDto> {
        const campaign = await this.campaignRepository.findById(id);
        if (!campaign) throw new CampaignNotFoundError(id);

        if (campaign.getStatus() !== CampaignStatus.DRAFT) {
            throw new CampaignValidationError('Only draft campaigns can be updated');
        }

        // Apply updates... (This is a simplified version)
        // In a real implementation, we would have specific methods on the entity to update fields.

        await this.campaignRepository.save(campaign);

        return CampaignMapper.toDto(campaign);
    }
}
