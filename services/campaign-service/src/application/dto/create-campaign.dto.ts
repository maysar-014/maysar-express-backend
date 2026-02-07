import { CampaignType, RuleType, ConditionType } from '../../domain/types/campaign.types';

export interface CreatePricingRuleDto {
    type: RuleType;
    value: number;
    priority?: number;
    conditions?: Record<string, any>;
}

export interface CreateConditionDto {
    type: ConditionType;
    operator: string;
    value: any;
}

export interface CreateCampaignDto {
    name: string;
    description?: string;
    type: CampaignType;
    startDate: Date;
    endDate?: Date;
    timezone?: string;
    pricingRules: CreatePricingRuleDto[];
    conditions?: CreateConditionDto[];
    productIds?: string[];
    categoryIds?: string[];
}
