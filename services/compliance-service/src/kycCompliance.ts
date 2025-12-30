import { PrismaClient } from '@prisma/client';
import { EventBus } from './shared/events/eventBus';

const prisma = new PrismaClient();
const eventBus = new EventBus();

export interface KYCVerificationRequest {
  id: string;
  userId: string;
  verificationType: 'identity' | 'address' | 'business' | 'enhanced';
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  submittedAt: Date;
  verifiedAt?: Date;
  expiresAt?: Date;
  riskAssessment?: KYCRiskAssessment;
  rejectionReason?: string;
}

export interface KYCRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  score: number; // 0-100
  recommendedActions: string[];
  assessedAt: Date;
}

export class KYCComplianceService {
  /**
   * Submit KYC documents for verification
   */
  async submitKYCVerification(
    userId: string,
    verificationType: 'identity' | 'address' | 'business' | 'enhanced',
    documents: Array<{
      type: string;
      fileUrl: string;
      fileName: string;
      uploadedAt: Date;
    }>
  ): Promise<KYCVerificationRequest> {
    // Create KYC record
    const kycRecord = await prisma.kYCRecord.create({
      data: {
        userId,
        verificationStatus: 'submitted',
        submittedAt: new Date(),
        documents: {
          files: documents,
          submittedAt: new Date(),
        },
      },
    });

    // Emit event for processing
    await eventBus.publish('KYCVerificationSubmitted.v1', {
      kycId: kycRecord.id,
      userId,
      verificationType,
      submittedAt: new Date(),
      documentCount: documents.length,
    });

    return {
      id: kycRecord.id,
      userId: kycRecord.userId,
      verificationType,
      status: kycRecord.verificationStatus,
      submittedAt: kycRecord.submittedAt,
    };
  }

  /**
   * Process KYC verification (called by compliance officers)
   */
  async processKYCVerification(
    kycId: string,
    verifierId: string,
    decision: 'approve' | 'reject',
    riskAssessment?: KYCRiskAssessment,
    rejectionReason?: string
  ): Promise<void> {
    const updateData: any = {
      verifiedAt: new Date(),
      verifiedBy: verifierId,
    };

    if (decision === 'approve') {
      updateData.verificationStatus = 'approved';
      // Set expiry based on verification type and risk level
      const expiryDate = this.calculateExpiryDate(riskAssessment?.riskLevel || 'medium');
      updateData.expiryDate = expiryDate;
      updateData.riskLevel = riskAssessment?.riskLevel || 'medium';
    } else {
      updateData.verificationStatus = 'rejected';
      updateData.rejectionReason = rejectionReason;
    }

    await prisma.kYCRecord.update({
      where: { id: kycId },
      data: updateData,
    });

    // Emit completion event
    await eventBus.publish('KYCVerificationCompleted.v1', {
      kycId,
      decision,
      verifierId,
      verifiedAt: new Date(),
      riskLevel: riskAssessment?.riskLevel,
      rejectionReason,
    });

    // If approved, emit additional event for account activation
    if (decision === 'approve') {
      const kycRecord = await prisma.kYCRecord.findUnique({ where: { id: kycId } });
      await eventBus.publish('KYCVerificationApproved.v1', {
        userId: kycRecord?.userId,
        kycId,
        expiryDate: kycRecord?.expiryDate,
        riskLevel: riskAssessment?.riskLevel,
      });
    }
  }

  /**
   * Perform automated risk assessment
   */
  async performRiskAssessment(userId: string, kycData: any): Promise<KYCRiskAssessment> {
    // This would integrate with external KYC providers and risk engines
    // For now, return a mock assessment

    const riskFactors: string[] = [];
    let score = 50; // Base score

    // Analyze user data for risk factors
    if (kycData.country === 'high_risk_country') {
      riskFactors.push('High-risk country of origin');
      score += 30;
    }

    if (kycData.transactionVolume > 10000) {
      riskFactors.push('High transaction volume');
      score += 20;
    }

    if (kycData.accountAge < 30) {
      riskFactors.push('New account');
      score += 15;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score < 30) riskLevel = 'low';
    else if (score < 60) riskLevel = 'medium';
    else if (score < 80) riskLevel = 'high';
    else riskLevel = 'critical';

    const recommendedActions = this.getRecommendedActions(riskLevel, riskFactors);

    return {
      riskLevel,
      riskFactors,
      score: Math.min(score, 100),
      recommendedActions,
      assessedAt: new Date(),
    };
  }

  /**
   * Check if KYC verification is still valid
   */
  async isKYCValid(userId: string): Promise<boolean> {
    const latestKYC = await prisma.kYCRecord.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    if (!latestKYC) return false;

    // Check if approved and not expired
    return (
      latestKYC.verificationStatus === 'approved' &&
      (!latestKYC.expiryDate || latestKYC.expiryDate > new Date())
    );
  }

  /**
   * Get KYC status for a user
   */
  async getKYCStatus(userId: string): Promise<KYCVerificationRequest | null> {
    const kycRecord = await prisma.kYCRecord.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    if (!kycRecord) return null;

    return {
      id: kycRecord.id,
      userId: kycRecord.userId,
      verificationType: 'identity', // Default, would be stored in schema
      status: kycRecord.verificationStatus,
      submittedAt: kycRecord.submittedAt,
      verifiedAt: kycRecord.verifiedAt || undefined,
      expiresAt: kycRecord.expiryDate || undefined,
      rejectionReason: kycRecord.rejectionReason || undefined,
    };
  }

  /**
   * Automated KYC retention policy enforcement
   * Deletes or anonymizes KYC data based on retention policies
   */
  async enforceRetentionPolicy(): Promise<void> {
    const retentionPolicy = await prisma.dataRetentionPolicy.findFirst({
      where: {
        dataType: 'kyc_documents',
        applicableLaw: 'GDPR',
      },
    });

    if (!retentionPolicy?.autoDelete) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPolicy.retentionPeriod);

    // Find expired KYC records
    const expiredRecords = await prisma.kYCRecord.findMany({
      where: {
        OR: [
          { expiryDate: { lt: cutoffDate } },
          {
            verificationStatus: 'rejected',
            submittedAt: { lt: cutoffDate },
          },
        ],
      },
    });

    for (const record of expiredRecords) {
      // Log the deletion
      await prisma.dataDeletionLog.create({
        data: {
          userId: record.userId,
          dataType: 'kyc_documents',
          recordsDeleted: 1,
          requestedBy: 'system',
          reason: 'Automated retention policy enforcement',
        },
      });

      // Delete or anonymize the record
      if (record.verificationStatus === 'approved') {
        // For approved records, anonymize but keep audit trail
        await prisma.kYCRecord.update({
          where: { id: record.id },
          data: {
            documents: null,
            rejectionReason: 'Anonymized per retention policy',
          },
        });
      } else {
        // For rejected/expired records, delete completely
        await prisma.kYCRecord.delete({
          where: { id: record.id },
        });
      }

      // Emit audit event
      await eventBus.publish('KYCDataDeleted.v1', {
        kycId: record.id,
        userId: record.userId,
        reason: 'Retention policy enforcement',
        deletedAt: new Date(),
      });
    }
  }

  /**
   * Get KYC compliance metrics
   */
  async getKYCComplianceMetrics(): Promise<any> {
    const [
      totalRecords,
      approvedRecords,
      rejectedRecords,
      pendingRecords,
      expiredRecords,
    ] = await Promise.all([
      prisma.kYCRecord.count(),
      prisma.kYCRecord.count({ where: { verificationStatus: 'approved' } }),
      prisma.kYCRecord.count({ where: { verificationStatus: 'rejected' } }),
      prisma.kYCRecord.count({ where: { verificationStatus: 'pending' } }),
      prisma.kYCRecord.count({
        where: {
          verificationStatus: 'approved',
          expiryDate: { lt: new Date() },
        },
      }),
    ]);

    const approvalRate = totalRecords > 0 ? (approvedRecords / totalRecords) * 100 : 0;
    const pendingRate = totalRecords > 0 ? (pendingRecords / totalRecords) * 100 : 0;

    return {
      totalRecords,
      approvedRecords,
      rejectedRecords,
      pendingRecords,
      expiredRecords,
      approvalRate: Math.round(approvalRate * 100) / 100,
      pendingRate: Math.round(pendingRate * 100) / 100,
      complianceStatus: expiredRecords === 0 ? 'compliant' : 'requires_attention',
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate KYC expiry date based on risk level
   */
  private calculateExpiryDate(riskLevel: string): Date {
    const expiryDate = new Date();

    switch (riskLevel) {
      case 'low':
        expiryDate.setFullYear(expiryDate.getFullYear() + 5); // 5 years
        break;
      case 'medium':
        expiryDate.setFullYear(expiryDate.getFullYear() + 3); // 3 years
        break;
      case 'high':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
        break;
      case 'critical':
        expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 months
        break;
      default:
        expiryDate.setFullYear(expiryDate.getFullYear() + 3); // Default 3 years
    }

    return expiryDate;
  }

  /**
   * Get recommended actions based on risk assessment
   */
  private getRecommendedActions(riskLevel: string, riskFactors: string[]): string[] {
    const actions: string[] = [];

    if (riskLevel === 'high' || riskLevel === 'critical') {
      actions.push('Enhanced due diligence required');
      actions.push('Transaction monitoring increased');
      actions.push('Manual review by compliance officer');
    }

    if (riskFactors.includes('High-risk country of origin')) {
      actions.push('Additional source of wealth verification');
    }

    if (riskFactors.includes('High transaction volume')) {
      actions.push('Enhanced transaction monitoring');
    }

    if (actions.length === 0) {
      actions.push('Standard monitoring procedures');
    }

    return actions;
  }
}

// Event handlers for KYC compliance
export class KYCEventHandlers {
  private kycService: KYCComplianceService;

  constructor() {
    this.kycService = new KYCComplianceService();
  }

  async handleKYCVerificationSubmitted(event: any): Promise<void> {
    console.log('Processing KYC verification submission:', event.kycId);

    // Trigger automated risk assessment
    // In a real implementation, this would call external KYC providers
  }

  async handleKYCExpiryCheck(event: any): Promise<void> {
    console.log('Performing KYC expiry checks');

    // Check for expiring KYC records and send renewal reminders
    const expiringRecords = await prisma.kYCRecord.findMany({
      where: {
        verificationStatus: 'approved',
        expiryDate: {
          lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          gt: new Date(),
        },
      },
    });

    for (const record of expiringRecords) {
      await eventBus.publish('KYCExpiryReminder.v1', {
        kycId: record.id,
        userId: record.userId,
        expiryDate: record.expiryDate,
        daysUntilExpiry: Math.ceil(
          (record.expiryDate!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        ),
      });
    }
  }

  async handleRetentionPolicyCheck(event: any): Promise<void> {
    console.log('Enforcing KYC retention policies');

    await this.kycService.enforceRetentionPolicy();
  }
}
