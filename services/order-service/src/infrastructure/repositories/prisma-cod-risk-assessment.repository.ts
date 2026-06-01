import { PrismaClient } from '@prisma/client';
import {
  ICODRiskAssessmentRepository,
  RiskAssessmentRecord,
} from '../../domain/repositories/cod-risk-assessment.repository';
import { RiskFactor } from '../../domain/engines/cod-trust/per-order-risk.assessor';
import { databaseManager } from '../../config/database.config';

export class PrismaCODRiskAssessmentRepository implements ICODRiskAssessmentRepository {
  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async save(assessment: RiskAssessmentRecord): Promise<void> {
    await (this.prisma as any).order_CODRiskAssessment.upsert({
      where: { orderId: assessment.orderId },
      create: {
        id: assessment.id,
        buyerId: assessment.buyerId,
        orderId: assessment.orderId,
        riskLevel: assessment.riskLevel,
        activeFactors: assessment.activeFactors,
        requiresCommitmentFee: assessment.requiresCommitmentFee,
        requiresManualReview: assessment.requiresManualReview,
        createdAt: assessment.createdAt,
      },
      update: {
        riskLevel: assessment.riskLevel,
        activeFactors: assessment.activeFactors,
        requiresCommitmentFee: assessment.requiresCommitmentFee,
        requiresManualReview: assessment.requiresManualReview,
      },
    });
  }

  async findByOrderId(orderId: string): Promise<RiskAssessmentRecord | null> {
    const record = await (this.prisma as any).order_CODRiskAssessment.findUnique({
      where: { orderId },
    });

    if (!record) return null;

    return {
      id: record.id,
      buyerId: record.buyerId,
      orderId: record.orderId,
      riskLevel: record.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
      activeFactors: (record.activeFactors as string[]) as RiskFactor[],
      requiresCommitmentFee: record.requiresCommitmentFee,
      requiresManualReview: record.requiresManualReview,
      createdAt: record.createdAt,
    };
  }
}
