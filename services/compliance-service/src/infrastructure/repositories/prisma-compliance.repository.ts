import { Prisma, PrismaClient } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';

const toNullableJson = (value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const toJson = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const createRecordId = (modelName: string): string => makeId(getModelPrefix(modelName));

export class PrismaComplianceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertAmlRecord(data: {
    userId: string;
    sanctionsStatus: string;
    pepStatus: boolean;
    riskScore: number;
    flags?: Record<string, any> | null;
  }): Promise<string> {
    const record = await this.prisma.compliance_AMLRecord.upsert({
      where: { userId: data.userId },
      update: {
        sanctionsStatus: data.sanctionsStatus,
        pepStatus: data.pepStatus,
        riskScore: data.riskScore,
        flags: toJson(data.flags),
        lastCheckAt: new Date()
      },
      create: {
        id: createRecordId('Compliance_AMLRecord'),
        userId: data.userId,
        sanctionsStatus: data.sanctionsStatus,
        pepStatus: data.pepStatus,
        riskScore: data.riskScore,
        flags: toJson(data.flags),
        lastCheckAt: new Date()
      }
    });

    return record.id;
  }

  async createSubjectRightsRequest(data: {
    userId: string;
    requestType: 'access' | 'delete' | 'portability' | 'rectification';
    reason?: string;
    payload?: Record<string, any> | null;
  }): Promise<string> {
    const record = await this.prisma.compliance_SubjectRightsRequest.create({
      data: {
        id: createRecordId('Compliance_SubjectRightsRequest'),
        userId: data.userId,
        requestType: data.requestType,
        reason: data.reason ?? null,
        data: toJson(data.payload)
      }
    });

    return record.id;
  }

  async createDataDeletionLog(data: {
    userId: string;
    dataType: string;
    recordsDeleted: number;
    requestedBy: string;
    reason: string;
  }): Promise<string> {
    const record = await this.prisma.compliance_DataDeletionLog.create({
      data: {
        id: createRecordId('Compliance_DataDeletionLog'),
        userId: data.userId,
        dataType: data.dataType,
        recordsDeleted: data.recordsDeleted,
        requestedBy: data.requestedBy,
        reason: data.reason
      }
    });

    return record.id;
  }

  async upsertDataRetentionPolicy(data: {
    dataType: string;
    retentionPeriod: number;
    legalBasis: string;
    applicableLaw: string;
    autoDelete: boolean;
    nextReviewDate: Date;
  }): Promise<string> {
    const existing = await this.prisma.compliance_DataRetentionPolicy.findFirst({
      where: { dataType: data.dataType }
    });

    if (existing) {
      const updated = await this.prisma.compliance_DataRetentionPolicy.update({
        where: { id: existing.id },
        data: {
          retentionPeriod: data.retentionPeriod,
          legalBasis: data.legalBasis,
          applicableLaw: data.applicableLaw,
          autoDelete: data.autoDelete,
          nextReviewDate: data.nextReviewDate,
          lastReviewed: new Date()
        }
      });
      return updated.id;
    }

    const created = await this.prisma.compliance_DataRetentionPolicy.create({
      data: {
        id: createRecordId('Compliance_DataRetentionPolicy'),
        dataType: data.dataType,
        retentionPeriod: data.retentionPeriod,
        legalBasis: data.legalBasis,
        applicableLaw: data.applicableLaw,
        autoDelete: data.autoDelete,
        nextReviewDate: data.nextReviewDate,
        lastReviewed: new Date()
      }
    });

    return created.id;
  }

  async createDataProcessingRecord(data: {
    purpose: string;
    categories: Record<string, any>;
    recipients: Record<string, any>;
    retentionPeriod: string;
    securityMeasures: Record<string, any>;
  }): Promise<string> {
    const record = await this.prisma.compliance_DataProcessingRecord.create({
      data: {
        id: createRecordId('Compliance_DataProcessingRecord'),
        purpose: data.purpose,
        categories: toJson(data.categories) ?? Prisma.JsonNull,
        recipients: toJson(data.recipients) ?? Prisma.JsonNull,
        retentionPeriod: data.retentionPeriod,
        securityMeasures: toJson(data.securityMeasures) ?? Prisma.JsonNull
      }
    });

    return record.id;
  }

  async createPrivacyImpactAssessment(data: {
    projectName: string;
    assessor: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    findings?: Record<string, any> | null;
    recommendations?: Record<string, any> | null;
    status?: 'in_progress' | 'completed' | 'requires_action';
  }): Promise<string> {
    const record = await this.prisma.compliance_PrivacyImpactAssessment.create({
      data: {
        id: createRecordId('Compliance_PrivacyImpactAssessment'),
        projectName: data.projectName,
        assessor: data.assessor,
        riskLevel: data.riskLevel,
        findings: toJson(data.findings),
        recommendations: toJson(data.recommendations),
        status: data.status ?? 'in_progress'
      }
    });

    return record.id;
  }

  async upsertTcraRecord(data: {
    userId: string;
    licenseNumber?: string | null;
    status?: string;
    registrationAt?: Date | null;
    expiryDate?: Date | null;
    lastAuditAt?: Date | null;
    auditFindings?: Record<string, any> | null;
  }): Promise<string> {
    const existing = await this.prisma.compliance_TCRARecord.findFirst({
      where: { userId: data.userId }
    });

    if (existing) {
      const updated = await this.prisma.compliance_TCRARecord.update({
        where: { id: existing.id },
        data: {
          licenseNumber: data.licenseNumber ?? existing.licenseNumber,
          status: data.status ?? existing.status,
          registrationAt: data.registrationAt ?? existing.registrationAt,
          expiryDate: data.expiryDate ?? existing.expiryDate,
          lastAuditAt: data.lastAuditAt ?? existing.lastAuditAt,
          auditFindings: toNullableJson(data.auditFindings ?? existing.auditFindings),
          updatedAt: new Date()
        }
      });
      return updated.id;
    }

    const created = await this.prisma.compliance_TCRARecord.create({
      data: {
        id: createRecordId('Compliance_TCRARecord'),
        userId: data.userId,
        licenseNumber: data.licenseNumber ?? null,
        status: data.status ?? 'pending',
        registrationAt: data.registrationAt ?? null,
        expiryDate: data.expiryDate ?? null,
        lastAuditAt: data.lastAuditAt ?? null,
        auditFindings: toNullableJson(data.auditFindings)
      }
    });

    return created.id;
  }

  async upsertTraRecord(data: {
    userId: string;
    tin: string;
    vrn?: string | null;
    taxComplianceStatus?: string;
    lastFiscalCheck?: Date | null;
    efdStatus?: string | null;
  }): Promise<string> {
    const record = await this.prisma.compliance_TRARecord.upsert({
      where: { tin: data.tin },
      update: {
        userId: data.userId,
        vrn: data.vrn ?? null,
        taxComplianceStatus: data.taxComplianceStatus ?? 'pending',
        lastFiscalCheck: data.lastFiscalCheck ?? null,
        efdStatus: data.efdStatus ?? null,
        updatedAt: new Date()
      },
      create: {
        id: createRecordId('Compliance_TRARecord'),
        userId: data.userId,
        tin: data.tin,
        vrn: data.vrn ?? null,
        taxComplianceStatus: data.taxComplianceStatus ?? 'pending',
        lastFiscalCheck: data.lastFiscalCheck ?? null,
        efdStatus: data.efdStatus ?? null
      }
    });

    return record.id;
  }

  async upsertMarketRecord(data: {
    sellerId: string;
    ethicalScore?: number | null;
    qualityStatus?: string;
    certifications?: Record<string, any> | null;
    lastAuditAt?: Date | null;
  }): Promise<string> {
    const existing = await this.prisma.compliance_MarketRecord.findFirst({
      where: { sellerId: data.sellerId }
    });

    if (existing) {
      const updated = await this.prisma.compliance_MarketRecord.update({
        where: { id: existing.id },
        data: {
          ethicalScore: data.ethicalScore ?? existing.ethicalScore,
          qualityStatus: data.qualityStatus ?? existing.qualityStatus,
          certifications: toNullableJson(data.certifications ?? existing.certifications),
          lastAuditAt: data.lastAuditAt ?? existing.lastAuditAt,
          updatedAt: new Date()
        }
      });
      return updated.id;
    }

    const created = await this.prisma.compliance_MarketRecord.create({
      data: {
        id: createRecordId('Compliance_MarketRecord'),
        sellerId: data.sellerId,
        ethicalScore: data.ethicalScore ?? null,
        qualityStatus: data.qualityStatus ?? 'pending',
        certifications: toNullableJson(data.certifications),
        lastAuditAt: data.lastAuditAt ?? null
      }
    });

    return created.id;
  }
}
