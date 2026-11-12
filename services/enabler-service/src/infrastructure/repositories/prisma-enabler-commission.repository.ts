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
    const earningsDelegate = (this.prismaClient as any).enabler_Earning;
    const where = {
      enablerId,
      ...(query.status ? { status: query.status } : {})
    };

    const [items, legacyTotal] = await Promise.all([
      this.prismaClient.enabler_Commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: earningsDelegate ? 0 : (page - 1) * limit,
        take: earningsDelegate ? (page - 1) * limit + limit : limit,
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

    if (!earningsDelegate) {
      return {
        items: items.map((item) => this.mapLegacyEntry(item)),
        page,
        limit,
        total: legacyTotal,
        totalPages: legacyTotal === 0 ? 0 : Math.ceil(legacyTotal / limit)
      };
    }

    const earningStatuses = query.status === 'pending' ? ['ATTRIBUTED', 'PENDING']
      : query.status === 'approved' ? ['QUALIFIED', 'AVAILABLE']
      : query.status === 'paid' ? ['PAID']
      : query.status === 'disputed' ? ['DISPUTED']
      : query.status === 'forfeited' ? ['CANCELLED', 'REVERSED', 'REJECTED']
      : query.status === 'on_hold' ? [] : undefined;
    const earningWhere = { enablerId, ...(earningStatuses ? { status: { in: earningStatuses } } : {}) };
    const [earnings, earningTotal] = await Promise.all([
      earningStatuses?.length === 0 ? Promise.resolve([]) : earningsDelegate.findMany({
        where: earningWhere,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: (page - 1) * limit + limit,
      }),
      earningStatuses?.length === 0 ? Promise.resolve(0) : earningsDelegate.count({ where: earningWhere }),
    ]);
    const legacyRows = items.filter((item: any) => !earnings.some((earning: any) => earning.orderId === item.enablerOrder?.orderId));
    const earningRows = earnings.map((earning: any) => this.mapEarningEntry(earning));
    const merged = [...legacyRows.map((item: any) => this.mapLegacyEntry(item)), ...earningRows]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * limit;
    const total = legacyTotal + earningTotal;

    return {
      items: merged.slice(start, start + limit),
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

    const earningsDelegate = (this.prismaClient as any).enabler_Earning;
    if (earningsDelegate) {
      const [earningAggregate, earningGrouped, latestEnablerPaid] = await Promise.all([
        earningsDelegate.aggregate({ where: { enablerId }, _sum: { amount: true }, _count: { _all: true } }),
        earningsDelegate.groupBy({ by: ['status'], where: { enablerId }, _sum: { amount: true }, _count: { _all: true } }),
        earningsDelegate.findFirst({ where: { enablerId, paidAt: { not: null } }, orderBy: { paidAt: 'desc' }, select: { paidAt: true } }),
      ]);
      for (const item of earningGrouped) {
        const mapped = this.mapEarningStatus(String(item.status));
        if (!mapped) continue;
        totals[mapped] += toNumber(item._sum.amount);
        counts[mapped] += item._count._all;
      }
      const totalCommission = toNumber(aggregate._sum.totalCommission) + toNumber(earningAggregate._sum.amount);
      const totalPending = totals.pending;
      const totalApproved = totals.approved;
      const totalPaid = totals.paid;
      const totalOnHold = totals.on_hold;
      const totalDisputed = totals.disputed;
      const totalForfeited = totals.forfeited;
      return {
        currency: 'TZS' as const,
        totalCommission,
        totalPaid,
        totalPending,
        totalApproved,
        totalOnHold,
        totalDisputed,
        totalForfeited,
        totalOutstanding: totalPending + totalApproved + totalOnHold,
        counts: {
          all: aggregate._count._all + earningAggregate._count._all,
          pending: counts.pending,
          approved: counts.approved,
          paid: counts.paid,
          onHold: counts.on_hold,
          disputed: counts.disputed,
          forfeited: counts.forfeited
        },
        lastPaidAt: latestEnablerPaid?.paidAt ?? latestPaid?.paidAt ?? null,
      };
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

  private mapLegacyEntry(item: any) {
    return {
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
      updatedAt: item.updatedAt,
    };
  }

  private mapEarningEntry(earning: any) {
    const status = this.mapEarningStatus(String(earning.status)) ?? 'pending';
    return {
      id: earning.id,
      enablerId: earning.enablerId,
      enablerOrderId: earning.id,
      orderId: earning.orderId,
      commissionId: earning.commissionId ?? null,
      status,
      baseCommission: toNumber(earning.amount),
      tierBonus: 0,
      performanceBonus: 0,
      totalCommission: toNumber(earning.amount),
      protectionStatus: earning.status === 'DISPUTED' ? 'disputed' : 'active',
      fraudCheckStatus: 'not_applicable',
      approvedAt: earning.qualifiedAt ?? null,
      holdUntil: null,
      paidAt: earning.paidAt ?? null,
      payoutId: earning.payoutId ?? null,
      paymentMethod: earning.walletTransactionId ? 'WALLET' : null,
      createdAt: earning.createdAt,
      updatedAt: earning.updatedAt,
    };
  }

  private mapEarningStatus(status: string): 'pending' | 'approved' | 'paid' | 'on_hold' | 'disputed' | 'forfeited' | null {
    if (status === 'ATTRIBUTED' || status === 'PENDING') return 'pending';
    if (status === 'QUALIFIED' || status === 'AVAILABLE') return 'approved';
    if (status === 'PAID') return 'paid';
    if (status === 'DISPUTED') return 'disputed';
    if (status === 'CANCELLED' || status === 'REVERSED' || status === 'REJECTED') return 'forfeited';
    return null;
  }
}
