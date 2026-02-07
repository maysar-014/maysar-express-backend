import { CampaignType, CampaignStatus, RuleType, ConditionType } from '../../domain/types/campaign.types';

export interface PricingRuleDto {
    id: string;
    type: RuleType;
    value: number;
    priority: number;
    conditions?: Record<string, any>;
}

export interface CampaignConditionDto {
    id: string;
    type: ConditionType;
    operator: string;
    value: any;
}

export interface CampaignDto {
    id: string;
    name: string;
    description?: string;
    type: CampaignType;
    status: CampaignStatus;
    startDate: Date;
    endDate?: Date;
    timezone: string;
    sellerId: string;
    createdBy: string;
    pricingRules: PricingRuleDto[];
    conditions: CampaignConditionDto[];
    productIds: string[];
    categoryIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CampaignMetricsDto {
    campaignId: string;
    views: number;
    conversions: number;
    revenue: number;
    totalProductsAffected: number;
    totalRevenueImpact: number;
    averageDiscountPercent: number;
}
