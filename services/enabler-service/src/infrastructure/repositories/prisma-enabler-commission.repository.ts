import { Prisma, PrismaClient } from '@prisma/client';
import {
  EnablerCommissionLedgerQuery,
  IEnablerCommissionRepository
} from '../../domain/repositories/enabler-commission.repository.interface';
import { EnablerCommissionEntity } from '../../domain/entities/enabler-commission.entity';
import prisma from '../database/prisma-client';

const toNumber = (value: Prisma.Decimal | number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
};

export class PrismaEnablerCommissionRepository implements IEnablerCommissionRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async upsert(commission: EnablerCommissionEntity): Promise<void> {
    const data = commission.toPlainObject();

    await this.prismaClient.enabler_Commission.upsert({
      where: { enablerOrderId: data.enablerOrderId },
      update: {
        commissionId: data.commissionId ?? null,
        baseCommission: new Prisma.Decimal(data.baseCommission),
        tierBonus: new Prisma.Decimal(data.tierBonus),
        performanceBonus: new Prisma.Decimal(data.performanceBonus),
        totalCommission: new Prisma.Decimal(data.totalCommission),
        status: data.status,
        approvedBy: data.approvedBy ?? null,
        approvedAt: data.approvedAt ?? null,
        holdUntil: data.holdUntil ?? null,
        protectionStatus: data.protectionStatus,
        fraudCheckStatus: data.fraudCheckStatus,
        payoutId: data.payoutId ?? null,
        paidAt: data.paidAt ?? null,
        paymentMethod: data.paymentMethod ?? null,
        calculationDetails: data.calculationDetails ?? undefined,
        metadata: data.metadata ?? undefined,
        updatedAt: new Date()
      },
      create: {
        id: data.id,
        enablerId: data.enablerId,
        enablerOrderId: data.enablerOrderId,
        commissionId: data.commissionId ?? null,
        baseCommission: new Prisma.Decimal(data.baseCommission),
        tierBonus: new Prisma.Decimal(data.tierBonus),
        performanceBonus: new Prisma.Decimal(data.performanceBonus),
        totalCommission: new Prisma.Decimal(data.totalCommission),
        status: data.status,
        approvedBy: data.approvedBy ?? null,
        approvedAt: data.approvedAt ?? null,
        holdUntil: data.holdUntil ?? null,
        protectionStatus: data.protectionStatus,
        fraudCheckStatus: data.fraudCheckStatus,
        payoutId: data.payoutId ?? null,
        paidAt: data.paidAt ?? null,
        paymentMethod: data.paymentMethod ?? null,
        calculationDetails: data.calculationDetails ?? undefined,
        metadata: data.metadata ?? undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    });
  }

  async findLedgerByEnablerId(enablerId: string, query: EnablerCommissionLedgerQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where = {
      enablerId,
      ...(query.status ? { status: query.status } : {})
    };

    const [items, total] = await Promise.all([
      this.prismaClient.enabler_Commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          enablerOrder: {
            select: {
              orderId: true
            }
          }
        }
      }),
      this.prismaClient.enabler_Commission.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        enablerId: item.enablerId,
        enablerOrderId: item.enablerOrderId,
        orderId: item.enablerOrder?.orderId ?? null,
        commissionId: item.commissionId ?? null,
        status: item.status,
        baseCommission: toNumber(item.baseCommission),
        tierBonus: toNumber(item.tierBonus),
        performanceBonus: toNumber(item.performanceBonus),
        totalCommission: toNumber(item.totalCommission),
        protectionStatus: item.protectionStatus,
        fraudCheckStatus: item.fraudCheckStatus,
        approvedAt: item.approvedAt ?? null,
        holdUntil: item.holdUntil ?? null,
        paidAt: item.paidAt ?? null,
        payoutId: item.payoutId ?? null,
        paymentMethod: item.paymentMethod ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
    };
  }

  async getSummaryByEnablerId(enablerId: string) {
    const [aggregate, grouped, latestPaid] = await Promise.all([
      this.prismaClient.enabler_Commission.aggregate({
        where: { enablerId },
        _sum: { totalCommission: true },
        _count: { _all: true }
      }),
      this.prismaClient.enabler_Commission.groupBy({
        by: ['status'],
        where: { enablerId },
        _sum: { totalCommission: true },
        _count: { _all: true }
      }),
      this.prismaClient.enabler_Commission.findFirst({
        where: {
          enablerId,
          paidAt: { not: null }
        },
        orderBy: { paidAt: 'desc' },
        select: { paidAt: true }
      })
    ]);

    const totals = {
      pending: 0,
      approved: 0,
      paid: 0,
      on_hold: 0,
      disputed: 0,
      forfeited: 0
    };
    const counts = {
      pending: 0,
      approved: 0,
      paid: 0,
      on_hold: 0,
      disputed: 0,
      forfeited: 0
    };

    for (const item of grouped) {
      if (item.status in totals) {
        totals[item.status as keyof typeof totals] = toNumber(item._sum.totalCommission);
        counts[item.status as keyof typeof counts] = item._count._all;
      }
    }

    return {
      currency: 'TZS' as const,
      totalCommission: toNumber(aggregate._sum.totalCommission),
      totalPaid: totals.paid,
      totalPending: totals.pending,
      totalApproved: totals.approved,
      totalOnHold: totals.on_hold,
      totalDisputed: totals.disputed,
      totalForfeited: totals.forfeited,
      totalOutstanding: totals.pending + totals.approved + totals.on_hold,
      counts: {
        all: aggregate._count._all,
        pending: counts.pending,
        approved: counts.approved,
        paid: counts.paid,
        onHold: counts.on_hold,
        disputed: counts.disputed,
        forfeited: counts.forfeited
      },
      lastPaidAt: latestPaid?.paidAt ?? null
    };
  }
}
