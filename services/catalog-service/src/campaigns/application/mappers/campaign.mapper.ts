import { Campaign } from '../../domain/entities/campaign.entity';
import { CampaignDto, PricingRuleDto, CampaignConditionDto } from '../dto/campaign.dto';
import { CampaignPricingRule } from '../../domain/entities/campaign-pricing-rule.entity';
import { CampaignCondition } from '../../domain/entities/campaign-condition.entity';
import { CampaignSchedule } from '../../domain/value-objects/campaign-schedule.value-object';
import { CampaignMetadata } from '../../domain/value-objects/campaign-metadata.value-object';
import { PricingRuleValue } from '../../domain/value-objects/pricing-rule-value.value-object';

export class CampaignMapper {
    static toDto(campaign: Campaign): CampaignDto {
        return {
            id: campaign.getId(),
            name: campaign.getName(),
            description: campaign.getDescription(),
            type: campaign.getType(),
            status: campaign.getStatus(),
            startDate: campaign.getSchedule().getStartDate(),
            endDate: campaign.getSchedule().getEndDate(),
            timezone: campaign.getSchedule().getTimezone(),
            sellerId: campaign.getSellerId(),
            createdBy: campaign.getCreatedBy(),
            pricingRules: campaign.getPricingRules().map(this.pricingRuleToDto),
            conditions: campaign.getConditions().map(this.conditionToDto),
            productIds: campaign.getProductIds(),
            categoryIds: campaign.getCategoryIds(),
            createdAt: campaign.getCreatedAt(),
            updatedAt: campaign.getUpdatedAt(),
        };
    }

    static toPersistence(campaign: Campaign): any {
        return {
            id: campaign.getId(),
            name: campaign.getName(),
            description: campaign.getDescription(),
            type: campaign.getType(),
            status: campaign.getStatus(),
            startDate: campaign.getSchedule().getStartDate(),
            endDate: campaign.getSchedule().getEndDate(),
            timezone: campaign.getSchedule().getTimezone(),
            sellerId: campaign.getSellerId(),
            createdBy: campaign.getCreatedBy(),
            metadata: campaign.getMetadata().getAll(),
            pricingRules: {
                deleteMany: {},
                create: campaign.getPricingRules().map(rule => ({
                    id: rule.getId(),
                    ruleType: rule.getRuleValue().getType(),
                    value: rule.getRuleValue().getValue(),
                    priority: rule.getPriority(),
                    conditions: rule.getConditions(),
                    createdAt: rule.getCreatedAt(),
                })),
            },
            conditions: {
                deleteMany: {},
                create: campaign.getConditions().map(cond => ({
                    id: cond.getId(),
                    type: cond.getType(),
                    operator: cond.getOperator(),
                    value: cond.getValue(),
                    createdAt: cond.getCreatedAt(),
                })),
            },
            products: {
                deleteMany: {},
                create: campaign.getProductIds().map(productId => ({
                    productId,
                    originalPrice: {},
                    campaignPrice: {},
                })),
            },
            categories: {
                deleteMany: {},
                create: campaign.getCategoryIds().map(categoryId => ({
                    categoryId,
                })),
            },
        };
    }

    static toDomain(record: any): Campaign {
        const schedule = CampaignSchedule.create(record.startDate, record.endDate, record.timezone);
        const metadata = CampaignMetadata.create(record.metadata as any);

        const pricingRules = record.pricingRules?.map((ruleRecord: any) => {
            const ruleValue = PricingRuleValue.create(ruleRecord.ruleType, Number(ruleRecord.value));
            return CampaignPricingRule.create(ruleRecord.id, ruleValue, ruleRecord.priority, ruleRecord.conditions as any);
        }) || [];

        const conditions = record.conditions?.map((condRecord: any) => {
            return CampaignCondition.create(condRecord.id, condRecord.type, condRecord.operator, condRecord.value);
        }) || [];

        const productIds = record.products?.map((p: any) => p.productId) || [];
        const categoryIds = record.categories?.map((c: any) => c.categoryId) || [];

        return Campaign.reconstitute(
            record.id,
            record.name,
            record.description,
            record.type,
            record.status,
            schedule,
            record.sellerId,
            record.createdBy,
            metadata,
            record.createdAt,
            record.updatedAt,
            pricingRules,
            conditions,
            productIds,
            categoryIds
        );
    }

    private static pricingRuleToDto(rule: CampaignPricingRule): PricingRuleDto {
        return {
            id: rule.getId(),
            type: rule.getRuleValue().getType(),
            value: rule.getRuleValue().getValue(),
            priority: rule.getPriority(),
            conditions: rule.getConditions(),
        };
    }

    private static conditionToDto(condition: CampaignCondition): CampaignConditionDto {
        return {
            id: condition.getId(),
            type: condition.getType(),
            operator: condition.getOperator(),
            value: condition.getValue(),
        };
    }
}
