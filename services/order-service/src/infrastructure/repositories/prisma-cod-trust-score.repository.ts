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
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    };
  }

  async upsert(buyerId: string, score: number, tier: TrustTier): Promise<TrustScoreRecord> {
    const record = await (this.prisma as any).order_CODTrustScore.upsert({
      where: { buyerId },
      create: { buyerId, score, tier },
      update: { score, tier },
    });

    return {
      buyerId: record.buyerId,
      score: record.score,
      tier: record.tier as TrustTier,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    };
  }
}
