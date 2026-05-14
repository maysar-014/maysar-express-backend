import { PrismaClient } from '@prisma/client';
import {
  ICODRestrictionRepository,
  CreateRestrictionDTO,
} from '../../domain/repositories/cod-restriction.repository';
import { RestrictionRecord } from '../../domain/engines/cod-trust/trust-signal.types';
import { databaseManager } from '../../config/database.config';
import { makeId, getModelPrefix } from '@shared/ids/id';

export class PrismaCODRestrictionRepository implements ICODRestrictionRepository {
  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async findActiveByBuyerId(buyerId: string): Promise<RestrictionRecord[]> {
    const now = new Date();
    const records = await (this.prisma as any).order_CODRestriction.findMany({
      where: {
        buyerId,
        OR: [
          { permanent: true },
          { endsAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r: any) => ({
      id: r.id,
      buyerId: r.buyerId,
      reason: r.reason,
      startAt: r.startAt,
      endsAt: r.endsAt,
      permanent: r.permanent,
      createdAt: r.createdAt,
    }));
  }

  async save(dto: CreateRestrictionDTO): Promise<RestrictionRecord> {
    const record = await (this.prisma as any).order_CODRestriction.create({
      data: {
        id: makeId(getModelPrefix('Order_CODRestriction')),
        buyerId: dto.buyerId,
        reason: dto.reason,
        endsAt: dto.endsAt,
        permanent: dto.permanent ?? false,
      },
    });

    return {
      id: record.id,
      buyerId: record.buyerId,
      reason: record.reason,
      startAt: record.startAt,
      endsAt: record.endsAt,
      permanent: record.permanent,
      createdAt: record.createdAt,
    };
  }

  async extendRestriction(buyerId: string, newEndsAt: Date): Promise<void> {
    // Extend the most recent active non-permanent restriction to the later end time
    const now = new Date();
    const existing = await (this.prisma as any).order_CODRestriction.findFirst({
      where: {
        buyerId,
        permanent: false,
        endsAt: { gt: now },
      },
      orderBy: { endsAt: 'desc' },
    });

    if (existing) {
      const laterDate = existing.endsAt > newEndsAt ? existing.endsAt : newEndsAt;
      await (this.prisma as any).order_CODRestriction.update({
        where: { id: existing.id },
        data: { endsAt: laterDate },
      });
    } else {
      // No active restriction — create a new one with a generic reason
      await this.save({
        buyerId,
        reason: 'Extended restriction',
        endsAt: newEndsAt,
        permanent: false,
      });
    }
  }
}
