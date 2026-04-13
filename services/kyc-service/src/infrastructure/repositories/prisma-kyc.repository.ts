import { Prisma, User_KycStatus } from '@prisma/client';
import { prisma } from '../database/prisma-client';
import {
  AggregatedKycUserData,
  KycData,
  KycStatus,
  KycStatusSnapshot,
  getKycLimitsForLevel
} from '../../domain/types/kyc.types';

export class PrismaKycRepository {
  async findUserSnapshot(userId: string): Promise<KycStatusSnapshot | null> {
    const user = await prisma.user_User.findUnique({
      where: { id: userId },
      select: {
        id: true,
        kycStatus: true,
        kycLevel: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycData: true,
        kycNationalId: true,
        kycLimitMaxListings: true,
        kycLimitMaxTransactions: true,
        kycLimitMaxEarnings: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      kycStatus: this.mapStatus(user.kycStatus),
      kycLevel: user.kycLevel ?? 0,
      kycSubmittedAt: user.kycSubmittedAt,
      kycVerifiedAt: user.kycVerifiedAt,
      kycData: (user.kycData as KycData | null | undefined) ?? null,
      kycNationalId: user.kycNationalId,
      kycLimitMaxListings: user.kycLimitMaxListings ?? 5,
      kycLimitMaxTransactions: user.kycLimitMaxTransactions ?? 1,
      kycLimitMaxEarnings: Number(user.kycLimitMaxEarnings ?? 0)
    };
  }

  async findByNationalId(nationalId: string, excludeUserId?: string): Promise<{ id: string } | null> {
    return prisma.user_User.findFirst({
      where: {
        kycNationalId: nationalId,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      },
      select: { id: true }
    });
  }

  async getAggregatedUserData(userId: string): Promise<AggregatedKycUserData> {
    const [orderCounts, listingCount, walletSum, transactionCount, user] = await Promise.all([
      prisma.order_Order.count({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }]
        }
      }),
      prisma.enabler_ProductListing.count({
        where: { enablerId: userId }
      }),
      prisma.wallet_Wallet.aggregate({
        where: { userId },
        _sum: { balance: true }
      }),
      prisma.wallet_Transaction.count({
        where: { userId }
      }),
      prisma.user_User.findUnique({
        where: { id: userId },
        select: {
          role: true,
          kycLevel: true
        }
      })
    ]);

    return {
      userId,
      role: String(user?.role || 'buyer').toLowerCase(),
      totalOrders: orderCounts,
      totalListings: listingCount,
      walletBalance: Number(walletSum._sum.balance ?? 0),
      totalTransactions: transactionCount,
      currentKycLevel: user?.kycLevel ?? 0
    };
  }

  async submitKyc(userId: string, payload: KycData): Promise<void> {
    await prisma.user_User.update({
      where: { id: userId },
      data: {
        kycStatus: User_KycStatus.PENDING,
        kycSubmittedAt: new Date(),
        kycData: payload as Prisma.InputJsonValue,
        kycNationalId: payload.nationalId ?? null
      }
    });
  }

  async updateKycStatus(userId: string, data: {
    status: KycStatus;
    level?: number;
    submittedAt?: Date;
    verifiedAt?: Date | null;
    nationalId?: string | null;
    kycData?: KycData | null;
  }): Promise<void> {
    const limits = getKycLimitsForLevel(data.level ?? 0);
    const updateData = {
      kycStatus: this.mapStatusToPrisma(data.status),
      ...(data.level !== undefined ? { kycLevel: data.level } : {}),
      ...(data.submittedAt ? { kycSubmittedAt: data.submittedAt } : {}),
      ...(data.verifiedAt !== undefined ? { kycVerifiedAt: data.verifiedAt } : {}),
      ...(data.nationalId !== undefined ? { kycNationalId: data.nationalId } : {}),
      ...(data.kycData !== undefined
        ? {
            kycData: data.kycData === null ? null : (data.kycData as Prisma.InputJsonValue)
          }
        : {}),
      kycLimitMaxListings: limits.maxListings,
      kycLimitMaxTransactions: limits.maxTransactions,
      kycLimitMaxEarnings: limits.maxEarnings
    } as Prisma.User_UserUpdateInput;

    await prisma.user_User.update({
      where: { id: userId },
      data: updateData
    });
  }

  async createAuditLog(entry: {
    userId: string;
    action: string;
    previousLevel?: number | null;
    newLevel?: number | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    performedBy?: string | null;
    reason?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<void> {
    await prisma.kyc_AuditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        previousLevel: entry.previousLevel ?? null,
        newLevel: entry.newLevel ?? null,
        previousStatus: entry.previousStatus ?? null,
        newStatus: entry.newStatus ?? null,
        performedBy: entry.performedBy ?? null,
        reason: entry.reason ?? null,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  private mapStatus(status: string): KycStatus {
    const normalized = String(status).toLowerCase();
    switch (normalized) {
      case 'pending':
        return KycStatus.PENDING;
      case 'verified':
        return KycStatus.VERIFIED;
      case 'rejected':
        return KycStatus.REJECTED;
      case 'none':
      default:
        return KycStatus.NONE;
    }
  }

  private mapStatusToPrisma(status: KycStatus): User_KycStatus {
    switch (status) {
      case KycStatus.PENDING:
        return User_KycStatus.PENDING;
      case KycStatus.VERIFIED:
        return User_KycStatus.VERIFIED;
      case KycStatus.REJECTED:
        return User_KycStatus.REJECTED;
      case KycStatus.NONE:
      default:
        return User_KycStatus.NONE;
    }
  }
}
