import { z } from 'zod';
import { CampaignType, RuleType, ConditionType, OperatorType } from '../../domain/enums';

export const CampaignPricingRuleSchema = z.object({
    type: z.nativeEnum(RuleType),
    value: z.number().positive(),
    priority: z.number().int().min(0).default(0),
    conditions: z.array(z.any()).optional()
});

export const CampaignConditionSchema = z.object({
    type: z.nativeEnum(ConditionType),
    operator: z.nativeEnum(OperatorType),
    value: z.any()
});

export const CreateCampaignSchema = z.object({
    name: z.string().min(3).max(255),
    description: z.string().max(1000).optional(),
    type: z.nativeEnum(CampaignType),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timezone: z.string().default('UTC'),
    pricingRules: z.array(CampaignPricingRuleSchema).min(1),
    conditions: z.array(CampaignConditionSchema).optional(),
    productIds: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional()
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial();
