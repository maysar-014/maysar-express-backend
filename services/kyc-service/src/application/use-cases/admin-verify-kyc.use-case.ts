import { Prisma } from '@prisma/client';
import { eventBus } from '../../../../../shared/events/eventBus';
import { getKycLimitsForLevel, KycStatus } from '../../domain/types/kyc.types';
import { PrismaKycRepository } from '../../infrastructure/repositories/prisma-kyc.repository';
import { prisma } from '../../infrastructure/database/prisma-client';

export class AdminVerifyKycUseCase {
  constructor(private readonly repository: PrismaKycRepository) {}

  async execute(input: {
    userId: string;
    action: 'approve' | 'reject';
    adminUserId: string;
    kycLevel?: number;
    reason?: string;
  }): Promise<{ success: true; status: KycStatus; level: number }> {
    const current = await this.repository.findUserSnapshot(input.userId);
    if (!current) {
      throw new Error('User not found');
    }

    if (current.kycStatus !== KycStatus.PENDING) {
      // Idempotent approve: if KYC is already verified, return current state without side-effects
      if (input.action === 'approve' && current.kycStatus === KycStatus.VERIFIED) {
        return { success: true, status: KycStatus.VERIFIED, level: current.kycLevel };
      }
      throw new Error('User KYC must be pending');
    }

    const previousLevel = current.kycLevel;
    const previousStatus = current.kycStatus;

    if (input.action === 'approve') {
      const approvedLevel = input.kycLevel ?? 1;
      const limits = getKycLimitsForLevel(approvedLevel);
      await this.repository.updateKycStatus(input.userId, {
        status: KycStatus.VERIFIED,
        level: approvedLevel,
        verifiedAt: new Date()
      });
      await this.repository.createAuditLog({
        userId: input.userId,
        action: 'approve',
        previousLevel,
        newLevel: approvedLevel,
        previousStatus,
        newStatus: KycStatus.VERIFIED,
        performedBy: input.adminUserId,
        reason: input.reason ?? null,
        metadata: { limits } as unknown as Prisma.InputJsonValue
      });
      await this.createStatusNotification(input.userId, 'KYC Verification Approved', `Your account has been verified at level ${approvedLevel}.`);
      await eventBus.publish('kyc.status_changed', {
        userId: input.userId,
        status: KycStatus.VERIFIED,
        kycLevel: approvedLevel
      });
      return { success: true, status: KycStatus.VERIFIED, level: approvedLevel };
    }

    await this.repository.updateKycStatus(input.userId, {
      status: KycStatus.REJECTED,
      verifiedAt: null
    });
    await this.repository.createAuditLog({
      userId: input.userId,
      action: 'reject',
      previousLevel,
      newLevel: previousLevel,
      previousStatus,
      newStatus: KycStatus.REJECTED,
      performedBy: input.adminUserId,
      reason: input.reason ?? null
    });
    await this.createStatusNotification(input.userId, 'KYC Verification Rejected', input.reason || 'Your KYC submission was rejected.');
    await eventBus.publish('kyc.status_changed', {
      userId: input.userId,
      status: KycStatus.REJECTED,
      kycLevel: previousLevel,
      reason: input.reason
    });
    return { success: true, status: KycStatus.REJECTED, level: previousLevel };
  }

  private async createStatusNotification(userId: string, subject: string, content: string): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'in_app',
          priority: 'high',
          subject,
          content,
          data: {} as unknown as Prisma.InputJsonValue,
          metadata: {} as unknown as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      console.warn('KYC status notification could not be persisted', {
        userId,
        subject,
        error: error instanceof Error ? error.message : error
      });
    }
  }
}
