import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from '../../types';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { Campaign } from '../../domain/entities/campaign.entity';
import { CampaignMapper } from '../../application/mappers/campaign.mapper';
import { CampaignStatus, CampaignType, ConditionType, ICampaignMetadata, RuleType } from '../../domain/types/campaign.types';

type CampaignPricingRuleWrite = {
    id: string;
    ruleType: RuleType;
    value: number;
    priority?: number;
    conditions?: Record<string, unknown>;
    createdAt?: Date;
};

type CampaignConditionWrite = {
    id: string;
    type: ConditionType;
    operator: string;
    value: unknown;
    createdAt?: Date;
};

type CampaignProductWrite = {
    productId: string;
    originalPrice: unknown;
    campaignPrice: unknown;
};

type CampaignCategoryWrite = {
    categoryId: string;
};

type CampaignWriteModel = {
    name: string;
    description?: string;
    type: CampaignType;
    status: CampaignStatus;
    startDate: Date;
    endDate?: Date;
    timezone: string;
    sellerId: string;
    createdBy: string;
    metadata?: ICampaignMetadata;
    pricingRules: { deleteMany: Record<string, never>; create: CampaignPricingRuleWrite[] };
    conditions: { deleteMany: Record<string, never>; create: CampaignConditionWrite[] };
    products: { deleteMany: Record<string, never>; create: CampaignProductWrite[] };
    categories: { deleteMany: Record<string, never>; create: CampaignCategoryWrite[] };
};

@injectable()
export class PrismaCampaignRepository implements ICampaignRepository {
    constructor(
        @inject(TYPES.PrismaClient)
        private readonly prisma: PrismaClient
    ) { }

    async findById(id: string): Promise<Campaign | null> {
        const record = await this.prisma.campaign_Campaign.findUnique({
            where: { id },
            include: {
                pricingRules: true,
                conditions: true,
                products: true,
                categories: true,
            },
        });

        if (!record) return null;

        return CampaignMapper.toDomain(this.normalizeRecord(record));
    }

    async save(campaign: Campaign): Promise<void> {
        const data = CampaignMapper.toPersistence(campaign) as CampaignWriteModel;

        await this.prisma.$transaction(async (tx) => {
            const campaignId = campaign.getId();

            // Upsert campaign
            await tx.campaign_Campaign.upsert({
                where: { id: campaignId },
                update: {
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    status: data.status,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    timezone: data.timezone,
                    metadata: data.metadata as any,
                    updatedAt: new Date(),
                },
                create: {
                    id: campaignId,
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    status: data.status,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    timezone: data.timezone,
                    sellerId: data.sellerId,
                    createdBy: data.createdBy,
                    metadata: data.metadata as any,
                },
            });

            await tx.campaign_Metrics.upsert({
                where: { campaignId },
                update: {
                    updatedAt: new Date()
                },
                create: {
                    campaignId
                }
            });

            // Handle pricing rules
            await tx.campaign_PricingRule.deleteMany({ where: { campaignId } });
            if (data.pricingRules.create.length > 0) {
                await tx.campaign_PricingRule.createMany({
                    data: data.pricingRules.create.map((r) => ({
                        id: r.id,
                        campaignId,
                        ruleType: r.ruleType,
                        value: r.value,
                        priority: r.priority,
                        conditions: r.conditions as any,
                        createdAt: r.createdAt,
                    })),
                });
            }

            // Handle conditions
            await tx.campaign_Condition.deleteMany({ where: { campaignId } });
            if (data.conditions.create.length > 0) {
                await tx.campaign_Condition.createMany({
                    data: data.conditions.create.map((c) => ({
                        id: c.id,
                        campaignId,
                        type: c.type,
                        operator: c.operator,
                        value: c.value as any,
                        createdAt: c.createdAt,
                    })),
                });
            }

            // Handle products
            await tx.campaign_Product.deleteMany({ where: { campaignId } });
            if (data.products.create.length > 0) {
                await tx.campaign_Product.createMany({
                    data: data.products.create.map((p) => ({
                        campaignId,
                        productId: p.productId,
                        originalPrice: p.originalPrice as any,
                        campaignPrice: p.campaignPrice as any,
                    })),
                });
            }

            // Handle categories
            await tx.campaign_Category.deleteMany({ where: { campaignId } });
            if (data.categories.create.length > 0) {
                await tx.campaign_Category.createMany({
                    data: data.categories.create.map((cat) => ({
                        campaignId,
                        categoryId: cat.categoryId,
                    })),
                });
            }
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.campaign_Campaign.delete({ where: { id } });
    }

    async findAll(filters?: Record<string, unknown>): Promise<Campaign[]> {
        const records = await this.prisma.campaign_Campaign.findMany({
            where: filters,
            include: {
                pricingRules: true,
                conditions: true,
                products: true,
                categories: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return records.map(record => CampaignMapper.toDomain(this.normalizeRecord(record)));
    }

    async findBySellerId(sellerId: string): Promise<Campaign[]> {
        return this.findAll({ sellerId });
    }

    private normalizeRecord(record: any) {
        return {
            ...record,
            description: record.description ?? undefined,
            metadata: record.metadata ?? undefined
        };
    }
}
