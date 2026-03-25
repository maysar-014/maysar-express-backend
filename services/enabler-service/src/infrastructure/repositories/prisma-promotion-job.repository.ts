import { Campaign_Status } from '@prisma/client';
import prisma from '../database/prisma-client';
import { PromotionJobEntity } from '../../domain/entities/promotion-job.entity';
import { IPromotionJobRepository, PromotionJobQuery } from '../../domain/repositories/promotion-job.repository.interface';

export class PrismaPromotionJobRepository implements IPromotionJobRepository {
  async findById(id: string): Promise<PromotionJobEntity | null> {
    const record = await prisma.campaign_Campaign.findFirst({
      where: {
        id,
        type: 'PROMOTION'
      },
      include: {
        pricingRules: true,
        products: true,
        categories: true
      }
    });

    if (!record) {
      return null;
    }

    return this.mapToEntity(record);
  }

  async findMarketplaceJobs(query: PromotionJobQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const statuses: Campaign_Status[] = query.status
      ? [query.status as Campaign_Status]
      : [Campaign_Status.ACTIVE, Campaign_Status.SCHEDULED];
    const excludeIds = Array.isArray(query.excludeIds) ? query.excludeIds.filter(Boolean) : [];

    const where = {
      type: 'PROMOTION' as const,
      status: { in: statuses },
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
    };

    const [records, total] = await Promise.all([
      prisma.campaign_Campaign.findMany({
        where,
        include: {
          pricingRules: true,
          products: true,
          categories: true
        },
        orderBy: [
          { startDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.campaign_Campaign.count({ where })
    ]);

    return {
      items: records.map((record) => this.mapToEntity(record)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
    };
  }

  private mapToEntity(record: any): PromotionJobEntity {
    return PromotionJobEntity.create({
      id: record.id,
      campaignId: record.id,
      title: record.name,
      description: record.description ?? undefined,
      sellerId: record.sellerId,
      type: record.type,
      status: record.status,
      startDate: record.startDate,
      endDate: record.endDate ?? null,
      timezone: record.timezone,
      productIds: (record.products || []).map((item: any) => item.productId),
      categoryIds: (record.categories || []).map((item: any) => item.categoryId),
      pricingRuleCount: Array.isArray(record.pricingRules) ? record.pricingRules.length : 0,
      metadata: (record.metadata as Record<string, any> | null) ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    });
  }
}
