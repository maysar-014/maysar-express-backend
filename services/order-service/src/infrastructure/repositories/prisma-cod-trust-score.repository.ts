import { PrismaClient } from '@prisma/client';
import { ICODTrustScoreRepository } from '../../domain/repositories/cod-trust-score.repository';
import { TrustTier, TrustScoreRecord } from '../../domain/engines/cod-trust/trust-signal.types';
import { databaseManager } from '../../config/database.config';

export class PrismaCODTrustScoreRepository implements ICODTrustScoreRepository {
  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async findByBuyerId(buyerId: string): Promise<TrustScoreRecord | null> {
    const record = await (this.prisma as any).order_CODTrustScore.findUnique({
      where: { buyerId },
    });

    if (!record) return null;

    return {
      buyerId: record.buyerId,
      score: record.score,
      tier: record.tier as TrustTier,
      lifetimeCODValue: Number(record.lifetimeCODValue ?? 0),
      activeExposure: Number(record.activeExposure ?? 0),
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    };
  }

  async upsert(buyerId: string, score: number, tier: TrustTier): Promise<TrustScoreRecord> {
    const record = await (this.prisma as any).order_CODTrustScore.upsert({
      where: { buyerId },
      create: { buyerId, score, tier, lifetimeCODValue: 0, activeExposure: 0 },
      update: { score, tier },
    });

    return {
      buyerId: record.buyerId,
      score: record.score,
      tier: record.tier as TrustTier,
      lifetimeCODValue: Number(record.lifetimeCODValue ?? 0),
      activeExposure: Number(record.activeExposure ?? 0),
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    };
  }

  async incrementLifetimeCODValue(buyerId: string, amount: number): Promise<void> {
    await (this.prisma as any).order_CODTrustScore.upsert({
      where: { buyerId },
      create: {
        buyerId,
        score: 0,
        tier: 'NEW_BUYER',
        lifetimeCODValue: BigInt(Math.round(amount)),
        activeExposure: 0,
      },
      update: {
        lifetimeCODValue: {
          increment: BigInt(Math.round(amount)),
        },
      },
    });
  }

  async decrementActiveExposure(buyerId: string, amount: number): Promise<void> {
    await (this.prisma as any).order_CODTrustScore.updateMany({
      where: { buyerId },
      data: {
        activeExposure: {
          decrement: BigInt(Math.round(amount)),
        },
      },
    });
  }

  async incrementActiveExposure(buyerId: string, amount: number): Promise<void> {
    await (this.prisma as any).order_CODTrustScore.upsert({
      where: { buyerId },
      create: {
        buyerId,
        score: 0,
        tier: 'NEW_BUYER',
        lifetimeCODValue: 0,
        activeExposure: BigInt(Math.round(amount)),
      },
      update: {
        activeExposure: {
          increment: BigInt(Math.round(amount)),
        },
      },
    });
  }

  async setDisputeWindowExpiry(orderId: string, expiresAt: Date): Promise<void> {
    await (this.prisma as any).order_CODDisputeWindow.upsert({
      where: { orderId },
      create: { orderId, expiresAt, suspended: false },
      update: { expiresAt, suspended: false },
    });
  }

  async getDisputeWindowExpiry(orderId: string): Promise<Date | null> {
    const record = await (this.prisma as any).order_CODDisputeWindow.findUnique({
      where: { orderId },
    });
    return record?.expiresAt ?? null;
  }

  async suspendLifetimeCODValueIncrement(orderId: string): Promise<void> {
    await (this.prisma as any).order_CODDisputeWindow.updateMany({
      where: { orderId },
      data: { suspended: true },
    });
  }
}
