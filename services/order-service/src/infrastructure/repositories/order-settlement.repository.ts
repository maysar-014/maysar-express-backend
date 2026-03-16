import { Prisma, PrismaClient } from '@prisma/client';
import type { PrismaTransaction } from '@shared/types';

export type OrderSettlementStatus = 'pending' | 'completed' | 'failed';

export interface OrderSettlementRecord {
  orderId: string;
  settlementId: string;
  sellerPayout: number;
  platformCommission: number;
  courierEarnings?: number | null;
  status: OrderSettlementStatus;
  processedAt?: Date | null;
  currency?: string;
}

export class OrderSettlementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: OrderSettlementRecord, transaction?: PrismaClient | PrismaTransaction): Promise<void> {
    const client = (transaction || this.prisma) as PrismaClient;
    await client.order_Settlement.create({
      data: {
        orderId: record.orderId,
        settlementId: record.settlementId,
        sellerPayout: new Prisma.Decimal(record.sellerPayout),
        platformCommission: new Prisma.Decimal(record.platformCommission),
        courierEarnings: record.courierEarnings !== undefined && record.courierEarnings !== null
          ? new Prisma.Decimal(record.courierEarnings)
          : null,
        currency: record.currency || 'TZS',
        status: this.toPrismaStatus(record.status),
        processedAt: record.processedAt ?? null
      }
    });
  }

  private toPrismaStatus(status: OrderSettlementStatus): 'PENDING' | 'PROCESSING' | 'COMPLETED' {
    if (status === 'completed') return 'COMPLETED';
    // Schema does not expose FAILED; keep failed settlements visible for manual review.
    if (status === 'failed') return 'PROCESSING';
    return 'PENDING';
  }
}
