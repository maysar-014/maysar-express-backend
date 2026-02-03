/**
 * Prisma Commission Repository
 * Infrastructure implementation of ICommissionRepository
 */

import { PrismaClient } from '@prisma/client';
import { Commission } from '../../domain/entities/commission.entity';
import { CommissionId, OrderId, SellerId } from '../../domain/value-objects/ids.value-object';
import { CommissionAmount, CommissionRate } from '../../domain/value-objects/monetary.value-object';
import { CommissionType, CommissionStatus } from '../../domain/value-objects/commission-types.value-object';
import { ICommissionRepository } from '../../domain/repositories/index';
import { prisma } from '../database/prisma-client';

export class PrismaCommissionRepository implements ICommissionRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async save(commission: Commission): Promise<void> {
    const data = {
      id: commission.id.toString(),
      orderId: commission.orderId.toString(),
      sellerId: commission.sellerId.toString(),
      amount: commission.amount.toNumber(),
      rate: commission.rate.toNumber(),
      type: commission.type as any,
      status: commission.status as any,
      paidAt: commission.paidAt || null,
      payoutId: commission.payoutId || null,
      metadata: commission.metadata || null,
      createdAt: commission.createdAt
    };

    await this.prismaClient.commission.upsert({
      where: { id: commission.id.toString() },
      update: data,
      create: data
    });
  }

  async findById(id: CommissionId): Promise<Commission | null> {
    const data = await this.prismaClient.commission.findUnique({
      where: { id: id.toString() }
    });

    if (!data) return null;

    return new Commission(
      CommissionId.fromString(data.id),
      OrderId.fromString(data.orderId),
      SellerId.fromString(data.sellerId),
      CommissionAmount.fromNumber(data.amount),
      CommissionRate.fromDecimal(data.rate),
      data.type as CommissionType,
      data.status as CommissionStatus,
      data.createdAt,
      data.paidAt || undefined,
      data.payoutId || undefined,
      data.metadata as Record<string, any> || undefined
    );
  }

  async findByOrderId(orderId: OrderId): Promise<Commission[]> {
    const commissions = await this.prismaClient.commission.findMany({
      where: { orderId: orderId.toString() }
    });

    return commissions.map((data: any) => new Commission(
      CommissionId.fromString(data.id),
      OrderId.fromString(data.orderId),
      SellerId.fromString(data.sellerId),
      CommissionAmount.fromNumber(data.amount),
      CommissionRate.fromDecimal(data.rate),
      data.type as CommissionType,
      data.status as CommissionStatus,
      data.createdAt,
      data.paidAt || undefined,
      data.payoutId || undefined,
      data.metadata as Record<string, any> || undefined
    ));
  }

  async findBySellerId(sellerId: SellerId): Promise<Commission[]> {
    const commissions = await this.prismaClient.commission.findMany({
      where: { sellerId: sellerId.toString() },
      orderBy: { createdAt: 'desc' }
    });

    return commissions.map((data: any) => new Commission(
      CommissionId.fromString(data.id),
      OrderId.fromString(data.orderId),
      SellerId.fromString(data.sellerId),
      CommissionAmount.fromNumber(data.amount),
      CommissionRate.fromDecimal(data.rate),
      data.type as CommissionType,
      data.status as CommissionStatus,
      data.createdAt,
      data.paidAt || undefined,
      data.payoutId || undefined,
      data.metadata as Record<string, any> || undefined
    ));
  }

  async findByStatus(status: CommissionStatus): Promise<Commission[]> {
    const commissions = await this.prismaClient.commission.findMany({
      where: { status: status },
      orderBy: { createdAt: 'desc' }
    });

    return commissions.map((data: any) => new Commission(
      CommissionId.fromString(data.id),
      OrderId.fromString(data.orderId),
      SellerId.fromString(data.sellerId),
      CommissionAmount.fromNumber(data.amount),
      CommissionRate.fromDecimal(data.rate),
      data.type as CommissionType,
      data.status as CommissionStatus,
      data.createdAt,
      data.paidAt || undefined,
      data.payoutId || undefined,
      data.metadata as Record<string, any> || undefined
    ));
  }

  async findPendingCommissions(): Promise<Commission[]> {
    return this.findByStatus(CommissionStatus.PENDING);
  }

  async findApprovedCommissions(): Promise<Commission[]> {
    return this.findByStatus(CommissionStatus.APPROVED);
  }

  async updateStatus(id: CommissionId, status: CommissionStatus): Promise<void> {
    await this.prismaClient.commission.update({
      where: { id: id.toString() },
      data: {
        status,
        paidAt: status === CommissionStatus.PAID ? new Date() : undefined
      }
    });
  }

  async getTotalCommissionForSeller(
    sellerId: SellerId,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<number> {
    const where: any = {
      sellerId: sellerId.toString(),
      status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] }
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const result = await this.prismaClient.commission.aggregate({
      where,
      _sum: { amount: true }
    });

    return result._sum.amount || 0;
  }

  async getCommissionSummary(sellerId: SellerId): Promise<{
    totalEarned: number;
    totalPaid: number;
    pendingAmount: number;
    averageRate: number;
  }> {
    const [totalEarnedResult, totalPaidResult, pendingResult, avgRateResult] = await Promise.all([
      this.prismaClient.commission.aggregate({
        where: {
          sellerId: sellerId.toString(),
          status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] }
        },
        _sum: { amount: true }
      }),
      this.prismaClient.commission.aggregate({
        where: {
          sellerId: sellerId.toString(),
          status: CommissionStatus.PAID
        },
        _sum: { amount: true }
      }),
      this.prismaClient.commission.aggregate({
        where: {
          sellerId: sellerId.toString(),
          status: CommissionStatus.PENDING
        },
        _sum: { amount: true }
      }),
      this.prismaClient.commission.aggregate({
        where: {
          sellerId: sellerId.toString(),
          status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] }
        },
        _avg: { rate: true }
      })
    ]);

    return {
      totalEarned: totalEarnedResult._sum.amount || 0,
      totalPaid: totalPaidResult._sum.amount || 0,
      pendingAmount: pendingResult._sum.amount || 0,
      averageRate: avgRateResult._avg.rate || 0
    };
  }
}
