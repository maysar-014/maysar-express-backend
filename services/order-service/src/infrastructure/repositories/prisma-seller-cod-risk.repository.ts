import { PrismaClient } from '@prisma/client';
import {
  ISellerCODRiskRepository,
  ISellerCODRiskEventRepository,
  SellerCODRiskRecord,
  SellerCODRiskEventRecord,
} from '../../domain/repositories/seller-cod-risk.repository';
import { databaseManager } from '../../config/database.config';

export class PrismaSellerCODRiskRepository implements ISellerCODRiskRepository {
  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async findBySellerId(sellerId: string): Promise<SellerCODRiskRecord | null> {
    const record = await (this.prisma as any).order_SellerCODRisk.findUnique({
      where: { sellerId },
    });

    if (!record) return null;

    return {
      id: record.id,
      sellerId: record.sellerId,
      disputeRate: Number(record.disputeRate),
      codSuspended: record.codSuspended,
      suspendedAt: record.suspendedAt ?? null,
      reinstatedAt: record.reinstatedAt ?? null,
      lastComputedAt: record.lastComputedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async upsert(
    data: Omit<SellerCODRiskRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SellerCODRiskRecord> {
    const record = await (this.prisma as any).order_SellerCODRisk.upsert({
      where: { sellerId: data.sellerId },
      create: {
        sellerId: data.sellerId,
        disputeRate: data.disputeRate,
        codSuspended: data.codSuspended,
        suspendedAt: data.suspendedAt,
        reinstatedAt: data.reinstatedAt,
        lastComputedAt: data.lastComputedAt,
      },
      update: {
        disputeRate: data.disputeRate,
        codSuspended: data.codSuspended,
        suspendedAt: data.suspendedAt,
        reinstatedAt: data.reinstatedAt,
        lastComputedAt: data.lastComputedAt,
      },
    });

    return {
      id: record.id,
      sellerId: record.sellerId,
      disputeRate: Number(record.disputeRate),
      codSuspended: record.codSuspended,
      suspendedAt: record.suspendedAt ?? null,
      reinstatedAt: record.reinstatedAt ?? null,
      lastComputedAt: record.lastComputedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

export class PrismaSellerCODRiskEventRepository implements ISellerCODRiskEventRepository {
  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async save(event: Omit<SellerCODRiskEventRecord, 'id' | 'createdAt'>): Promise<void> {
    await (this.prisma as any).order_SellerCODRiskEvent.create({
      data: {
        sellerId: event.sellerId,
        eventType: event.eventType,
        signalType: event.signalType ?? null,
        disputeRateAtEvent: event.disputeRateAtEvent,
      },
    });
  }

  async findBySellerIdSince(
    sellerId: string,
    since: Date,
  ): Promise<SellerCODRiskEventRecord[]> {
    const records = await (this.prisma as any).order_SellerCODRiskEvent.findMany({
      where: {
        sellerId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r: any) => ({
      id: r.id,
      sellerId: r.sellerId,
      eventType: r.eventType,
      signalType: r.signalType ?? null,
      disputeRateAtEvent: Number(r.disputeRateAtEvent),
      createdAt: r.createdAt,
    }));
  }
}
