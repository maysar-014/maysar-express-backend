import { Prisma, PrismaClient } from '@prisma/client';
import { IEarningsRepository, Earnings } from '../../domain/repositories';

export class PrismaEarningsRepository implements IEarningsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(earnings: Earnings): Promise<void> {
    const date = earnings.createdAt ? new Date(earnings.createdAt) : new Date();
    await this.prisma.logistics_Earning.upsert({
      where: { id: earnings.id },
      create: {
        id: earnings.id,
        courierId: earnings.courierId,
        date,
        baseEarnings: earnings.baseFare || 0,
        totalEarnings: earnings.totalEarnings || 0,
        createdAt: earnings.createdAt || new Date()
      },
      update: {
        courierId: earnings.courierId,
        date,
        baseEarnings: earnings.baseFare || 0,
        totalEarnings: earnings.totalEarnings || 0
      }
    });
  }

  async findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<Earnings[]> {
    const where = timeRange
      ? { courierId, createdAt: { gte: timeRange.start, lte: timeRange.end } }
      : { courierId };
    const records = await this.prisma.logistics_Earning.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return records.map((record) => this.toEarnings(record));
  }

  async findByDeliveryId(_deliveryId: string): Promise<Earnings | null> {
    return null;
  }

  async findAllEarnings(timeRange?: { start: Date; end: Date }): Promise<Earnings[]> {
    const where = timeRange
      ? { createdAt: { gte: timeRange.start, lte: timeRange.end } }
      : undefined;
    const records = await this.prisma.logistics_Earning.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return records.map((record) => this.toEarnings(record));
  }

  async updatePaymentStatus(_id: string, _status: 'pending' | 'paid' | 'failed', _paymentDate?: Date): Promise<void> {
    return;
  }

  async getCourierEarningsSummary(courierId: string, period: { start: Date; end: Date }): Promise<{
    totalEarnings: number;
    totalDeliveries: number;
    averagePerDelivery: number;
    pendingPayments: number;
    paidPayments: number;
  }> {
    const records = await this.prisma.logistics_Earning.findMany({
      where: { courierId, createdAt: { gte: period.start, lte: period.end } }
    });

    const totalEarnings = records.reduce((sum, record) => sum + record.totalEarnings, 0);
    const totalDeliveries = records.length;

    return {
      totalEarnings,
      totalDeliveries,
      averagePerDelivery: totalDeliveries ? totalEarnings / totalDeliveries : 0,
      pendingPayments: 0,
      paidPayments: 0
    };
  }

  async getPlatformEarningsSummary(period: { start: Date; end: Date }): Promise<{
    totalRevenue: number;
    totalCommissions: number;
    totalPayouts: number;
    netProfit: number;
    deliveryCount: number;
  }> {
    const records = await this.prisma.logistics_Earning.findMany({
      where: { createdAt: { gte: period.start, lte: period.end } }
    });

    const totalRevenue = records.reduce((sum, record) => sum + record.totalEarnings, 0);

    return {
      totalRevenue,
      totalCommissions: 0,
      totalPayouts: totalRevenue,
      netProfit: 0,
      deliveryCount: records.length
    };
  }

  private toEarnings(record: any): Earnings {
    return {
      id: record.id,
      courierId: record.courierId,
      deliveryId: '',
      baseFare: record.baseEarnings || 0,
      distanceFee: 0,
      weightFee: 0,
      priorityFee: 0,
      totalEarnings: record.totalEarnings || 0,
      commission: 0,
      netEarnings: record.totalEarnings || 0,
      paymentStatus: 'pending',
      paymentDate: undefined,
      createdAt: record.createdAt,
      updatedAt: record.createdAt
    };
  }
}
