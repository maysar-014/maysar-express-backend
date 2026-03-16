import { Prisma, PrismaClient } from '@prisma/client';
import { IEnablerCommissionRepository } from '../../domain/repositories/enabler-commission.repository.interface';
import { EnablerCommissionEntity } from '../../domain/entities/enabler-commission.entity';
import prisma from '../database/prisma-client';

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
}
