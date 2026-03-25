import { Prisma } from '@prisma/client';
import { IEnablerAnalyticsRepository } from '../../domain/repositories/enabler-analytics.repository.interface';
import prisma from '../database/prisma-client';
import { getModelPrefix, makeId } from '../../../../../shared/ids/id';

export class PrismaEnablerAnalyticsRepository implements IEnablerAnalyticsRepository {
  async upsertInitial(enablerId: string): Promise<void> {
    await prisma.enabler_Analytics.upsert({
      where: { enablerId },
      update: {
        lastActivityAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        id: makeId(getModelPrefix('Enabler_Analytics')),
        enablerId
      }
        });
  }

  async getSnapshot(enablerId: string) {
    const record = await prisma.enabler_Analytics.findUnique({
      where: { enablerId }
    });

    if (!record) {
      await this.upsertInitial(enablerId);
      return {
        totalSales: 0,
        totalOrders: 0,
        conversionRate: 0,
        totalCommissions: 0,
        metadata: null
      };
    }

    return {
      totalSales: Number(record.totalSales),
      totalOrders: Number(record.totalOrders),
      conversionRate: Number(record.conversionRate),
      totalCommissions: Number(record.totalCommissions),
      metadata: (record.metadata as Record<string, any> | null) ?? null
    };
  }

  async upsertReferralTracking(enablerId: string, referralTracking: Record<string, unknown>) {
    const existing = await prisma.enabler_Analytics.findUnique({
      where: { enablerId }
    });

    const existingMetadata = existing?.metadata && typeof existing.metadata === 'object'
      ? existing.metadata as Record<string, unknown>
      : {};

    const mergedMetadata = {
      ...existingMetadata,
      referralLink: {
        ...(existingMetadata.referralLink && typeof existingMetadata.referralLink === 'object'
          ? existingMetadata.referralLink as Record<string, unknown>
          : {}),
        ...referralTracking
      }
    };

    await prisma.enabler_Analytics.upsert({
      where: { enablerId },
      update: {
        metadata: mergedMetadata as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        id: makeId(getModelPrefix('Enabler_Analytics')),
        enablerId,
        metadata: mergedMetadata as Prisma.InputJsonValue
      }
    });

    return this.getSnapshot(enablerId);
  }
}
