import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { CampaignDto } from '../dto/campaign.dto';
import { CampaignNotFoundError } from '../../domain/errors/campaign.errors';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { CampaignValidationPolicy } from '../../domain/policies/campaign-validation.policy';

@injectable()
export class LaunchCampaignUseCase {
    private readonly validationPolicy = new CampaignValidationPolicy();

    constructor(
        @inject(TYPES.CampaignRepository)
        private readonly campaignRepository: ICampaignRepository
    ) { }

    async execute(id: string): Promise<CampaignDto> {
        const campaign = await this.campaignRepository.findById(id);
        if (!campaign) throw new CampaignNotFoundError(id);

        this.validationPolicy.validateLaunch(campaign);
        campaign.launch();
        await this.campaignRepository.save(campaign);

        // TODO: Trigger CampaignLaunchSaga

        return CampaignMapper.toDto(campaign);
    }
}
