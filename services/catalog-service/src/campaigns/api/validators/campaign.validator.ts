// @ts-nocheck
import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { CampaignType, RuleType, ConditionType, OperatorType } from '../../domain/types/campaign.types';

export const CampaignPricingRuleSchema = z.object({
    type: z.nativeEnum(RuleType),
    value: z.number().positive(),
    priority: z.number().int().min(0).default(0),
    conditions: z.array(z.any()).optional()
}).strict();

export const CampaignConditionSchema = z.object({
    type: z.nativeEnum(ConditionType),
    operator: z.nativeEnum(OperatorType),
    value: z.any().refine((value) => value !== null, {
        message: 'Condition value cannot be null'
    })
}).strict();

export const CreateCampaignSchema = z.object({
    name: z.string().min(3).max(255),
    description: z.string().max(1000).optional(),
    type: z.nativeEnum(CampaignType),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timezone: z.string().min(1).default('UTC'),
    pricingRules: z.array(CampaignPricingRuleSchema).min(1),
    conditions: z.array(CampaignConditionSchema).optional(),
    productIds: z.array(zodId()).optional(),
    categoryIds: z.array(zodId()).optional(),
    metadata: z.record(z.any()).optional()
}).strict();

export const UpdateCampaignSchema = CreateCampaignSchema.partial().strict();
