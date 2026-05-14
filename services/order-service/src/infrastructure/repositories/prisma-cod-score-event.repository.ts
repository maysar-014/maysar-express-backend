import { PrismaClient } from '@prisma/client';
import {
  ICODScoreEventRepository,
  AppendScoreEventDTO,
} from '../../domain/repositories/cod-score-event.repository';
import { ScoreEventRecord, TrustSignalType } from '../../domain/engines/cod-trust/trust-signal.types';
import { databaseManager } from '../../config/database.config';
import { makeId, getModelPrefix } from '@shared/ids/id';

export class PrismaCODScoreEventRepository implements ICODScoreEventRepository {
  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async append(dto: AppendScoreEventDTO): Promise<ScoreEventRecord> {
    const record = await (this.prisma as any).order_CODScoreEvent.create({
      data: {
        id: makeId(getModelPrefix('Order_CODScoreEvent')),
        buyerId: dto.buyerId,
        signalType: dto.signalType,
        delta: dto.delta,
        scoreBefore: dto.scoreBefore,
        scoreAfter: dto.scoreAfter,
        sourceService: dto.sourceService,
        sourceEntityId: dto.sourceEntityId,
      },
    });

    return {
      id: record.id,
      buyerId: record.buyerId,
      signalType: record.signalType as TrustSignalType,
      delta: record.delta,
      scoreBefore: record.scoreBefore,
      scoreAfter: record.scoreAfter,
      sourceService: record.sourceService,
      sourceEntityId: record.sourceEntityId,
      createdAt: record.createdAt,
    };
  }

  async findByBuyerId(buyerId: string): Promise<ScoreEventRecord[]> {
    const records = await (this.prisma as any).order_CODScoreEvent.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r: any) => ({
      id: r.id,
      buyerId: r.buyerId,
      signalType: r.signalType as TrustSignalType,
      delta: r.delta,
      scoreBefore: r.scoreBefore,
      scoreAfter: r.scoreAfter,
      sourceService: r.sourceService,
      sourceEntityId: r.sourceEntityId,
      createdAt: r.createdAt,
    }));
  }
}
