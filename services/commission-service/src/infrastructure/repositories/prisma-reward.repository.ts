import { Prisma, PrismaClient } from '@prisma/client';
import { IRewardRepository } from '../../domain/repositories';
import { RewardStatus } from '../../domain/value-objects/commission-types.value-object';
import { RecipientId } from '../../domain/value-objects/ids.value-object';
import { RecipientType } from '../../domain/value-objects/recipient-types.value-object';
import { prisma } from '../database/prisma-client';

export class PrismaRewardRepository implements IRewardRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async createReward(data: {
    recipientId: RecipientId;
    recipientType: RecipientType;
    type: string;
    amount: number;
    description?: string;
    expiresAt?: Date;
    referenceId?: string;
  }): Promise<string> {
    const row = await this.prismaClient.commission_Reward.create({
      data: {
        userId: data.recipientId.toString(),
        type: data.type as any,
        amount: new Prisma.Decimal(data.amount),
        description: data.description ?? null,
        status: RewardStatus.EARNED,
        expiresAt: data.expiresAt ?? null,
        referenceId: data.referenceId ?? null
      }
    });
    return row.id;
  }

  async findById(id: string): Promise<{
    id: string;
    recipientId: string;
    recipientType: RecipientType;
    type: string;
    amount: number;
    status: RewardStatus;
    description?: string;
    expiresAt?: Date;
    redeemedAt?: Date;
    referenceId?: string;
  } | null> {
    const row = await this.prismaClient.commission_Reward.findUnique({ where: { id } });
    if (!row) return null;

    return {
      id: row.id,
      recipientId: row.userId,
      recipientType: 'seller' as RecipientType,
      type: row.type,
      amount: Number(row.amount),
      status: row.status as RewardStatus,
      description: row.description ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
      redeemedAt: row.redeemedAt ?? undefined,
      referenceId: row.referenceId ?? undefined
    };
  }

  async updateStatus(id: string, status: RewardStatus): Promise<void> {
    await this.prismaClient.commission_Reward.update({
      where: { id },
      data: { status }
    });
  }

  async markRedeemed(id: string, redeemedAt: Date): Promise<void> {
    await this.prismaClient.commission_Reward.update({
      where: { id },
      data: { status: RewardStatus.REDEEMED, redeemedAt }
    });
  }

  async findExpiredRewards(): Promise<Array<{
    id: string;
    recipientId: string;
    amount: number;
  }>> {
    const now = new Date();
    const rows = await this.prismaClient.commission_Reward.findMany({
      where: {
        status: RewardStatus.EARNED,
        expiresAt: { lt: now }
      }
    });

    return rows.map(row => ({
      id: row.id,
      recipientId: row.userId,
      amount: Number(row.amount)
    }));
  }

  async findByRecipientId(recipientId: RecipientId): Promise<Array<{
    id: string;
    type: string;
    amount: number;
    status: RewardStatus;
    description?: string;
    expiresAt?: Date;
  }>> {
    const rows = await this.prismaClient.commission_Reward.findMany({
      where: { userId: recipientId.toString() },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      status: row.status as RewardStatus,
      description: row.description ?? undefined,
      expiresAt: row.expiresAt ?? undefined
    }));
  }
}
