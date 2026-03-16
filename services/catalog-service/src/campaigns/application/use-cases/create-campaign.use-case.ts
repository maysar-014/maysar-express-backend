import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CampaignDto } from '../dto/campaign.dto';
import { Campaign } from '../../domain/entities/campaign.entity';
import { CampaignSchedule } from '../../domain/value-objects/campaign-schedule.value-object';
import { CampaignMetadata } from '../../domain/value-objects/campaign-metadata.value-object';
import { PricingRuleValue } from '../../domain/value-objects/pricing-rule-value.value-object';
import { CampaignPricingRule } from '../../domain/entities/campaign-pricing-rule.entity';
import { CampaignCondition } from '../../domain/entities/campaign-condition.entity';
import { CampaignMapper } from '../mappers/campaign.mapper';
import { getModelPrefix, makeId } from '@shared/ids/id';

@injectable()
export class CreateCampaignUseCase {
    constructor(
        @inject(TYPES.CampaignRepository)
        private readonly campaignRepository: ICampaignRepository
    ) { }

    async execute(sellerId: string, createdBy: string, dto: CreateCampaignDto): Promise<CampaignDto> {
        const id = makeId(getModelPrefix('Campaign_Campaign'));
        const schedule = CampaignSchedule.create(dto.startDate, dto.endDate, dto.timezone);
        const metadata = CampaignMetadata.create();

        const campaign = Campaign.create(
            id,
            dto.name,
            dto.type,
            schedule,
            sellerId,
            createdBy,
            dto.description,
            metadata
        );

        // Add pricing rules
        for (const ruleDto of dto.pricingRules) {
            const ruleValue = PricingRuleValue.create(ruleDto.type, ruleDto.value);
            const rule = CampaignPricingRule.create(
                makeId(getModelPrefix('Campaign_PricingRule')),
                ruleValue,
                ruleDto.priority,
                ruleDto.conditions
            );
            campaign.addPricingRule(rule);
        }

        // Add conditions
        if (dto.conditions) {
            for (const condDto of dto.conditions) {
                const condition = CampaignCondition.create(
                    makeId(getModelPrefix('Campaign_Condition')),
                    condDto.type,
                    condDto.operator,
                    condDto.value
                );
                campaign.addCondition(condition);
            }
        }

        // Add products
        if (dto.productIds) {
            for (const productId of dto.productIds) {
                campaign.addProduct(productId);
            }
        }

        // Add categories
        if (dto.categoryIds) {
            for (const categoryId of dto.categoryIds) {
                campaign.addCategory(categoryId);
            }
        }

        await this.campaignRepository.save(campaign);

        return CampaignMapper.toDto(campaign);
    }
}
