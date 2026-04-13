import { Prisma } from '@prisma/client';
import { PrismaKycRepository } from '../../infrastructure/repositories/prisma-kyc.repository';
import { KycSubmissionPayload, KycStatus } from '../../domain/types/kyc.types';

export class SubmitKycUseCase {
  constructor(private readonly repository: PrismaKycRepository) {}

  async execute(userId: string, payload: KycSubmissionPayload): Promise<{
    success: true;
    status: KycStatus;
  }> {
    const current = await this.repository.findUserSnapshot(userId);
    if (!current) {
      throw new Error('User not found');
    }

    if (current.kycStatus === KycStatus.PENDING) {
      throw new Error('KYC submission already pending review');
    }

    const duplicate = await this.repository.findByNationalId(payload.nationalId, userId);
    if (duplicate) {
      throw new Error('National ID already exists');
    }

    try {
      await this.repository.submitKyc(userId, payload);
      await this.repository.createAuditLog({
        userId,
        action: 'submit',
        previousLevel: current.kycLevel,
        newLevel: current.kycLevel,
        previousStatus: current.kycStatus,
        newStatus: KycStatus.PENDING,
        metadata: { payload } as unknown as Prisma.InputJsonValue
      });
      return { success: true, status: KycStatus.PENDING };
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'P2002') {
        throw new Error('National ID already exists');
      }
      throw error;
    }
  }
}
