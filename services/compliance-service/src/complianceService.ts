import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus, EventBus } from '@shared-events/eventBus';
import { t } from '@shared/i18n/i18n';
import { i18next, i18nextMiddleware } from '@shared/i18n/i18n';
import { z } from 'zod';
import { isSystemId } from '@shared/validation/id';
import { PrismaComplianceRepository } from './infrastructure/repositories/prisma-compliance.repository';
import { createPrismaClient } from '@shared/database/prisma-client';

const parseOrRespond = (schema: z.ZodSchema, data: any, res: express.Response) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(422).json({ success: false, errors: result.error.errors });
    return null;
  }
  return result.data;
};

const supportedIdSchema = z
  .string()
  .trim()
  .refine((value) => isSystemId(value), { message: 'Expected system ID' });

const verifyDocumentSchema = z.object({
  userId: supportedIdSchema,
  documentType: z.enum(['national_id', 'passport', 'drivers_license', 'proof_of_address']),
  documentUrl: z.string().url()
});

const manualReviewSchema = z.object({
  userId: supportedIdSchema,
  decision: z.enum(['approved', 'rejected', 'under_review']),
  reviewerId: supportedIdSchema
});

const riskAssessmentSchema = z.object({
  userId: supportedIdSchema,
  assessmentType: z.string()
});

const monitorSchema = z.object({
  complianceType: z.literal('kyc'),
  entityId: z.string(),
  operation: z.string()
});

const generateReportSchema = z.object({
  reportType: z.literal('kyc'),
  period: z.string(),
  requestedBy: z.string()
});

const auditLogSchema = z.object({
  userId: supportedIdSchema,
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string()
});

const kycStatusParamSchema = z.object({
  userId: supportedIdSchema
});

const amlRecordSchema = z.object({
  userId: supportedIdSchema,
  sanctionsStatus: z.string().min(1).optional(),
  pepStatus: z.boolean().optional(),
  riskScore: z.number().min(0).max(100).optional(),
  flags: z.record(z.any()).optional()
});

const subjectRightsRequestSchema = z.object({
  userId: supportedIdSchema,
  requestType: z.enum(['access', 'delete', 'portability', 'rectification']),
  reason: z.string().optional(),
  payload: z.record(z.any()).optional()
});

const dataDeletionLogSchema = z.object({
  userId: supportedIdSchema,
  dataType: z.string().min(1),
  recordsDeleted: z.number().int().nonnegative(),
  requestedBy: supportedIdSchema,
  reason: z.string().min(1)
});

const dataRetentionPolicySchema = z.object({
  dataType: z.string().min(1),
  retentionPeriod: z.number().int().positive(),
  legalBasis: z.string().min(1),
  applicableLaw: z.string().min(1),
  autoDelete: z.boolean().default(true),
  nextReviewDate: z.coerce.date()
});

const dataProcessingRecordSchema = z.object({
  purpose: z.string().min(1),
  categories: z.record(z.any()),
  recipients: z.record(z.any()),
  retentionPeriod: z.string().min(1),
  securityMeasures: z.record(z.any())
});

const privacyImpactAssessmentSchema = z.object({
  projectName: z.string().min(1),
  assessor: z.string().min(1),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  findings: z.record(z.any()).optional(),
  recommendations: z.record(z.any()).optional(),
  status: z.enum(['in_progress', 'completed', 'requires_action']).optional()
});

const tcraRecordSchema = z.object({
  userId: supportedIdSchema,
  licenseNumber: z.string().optional(),
  status: z.string().optional(),
  registrationAt: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  lastAuditAt: z.coerce.date().optional(),
  auditFindings: z.record(z.any()).optional()
});

const traRecordSchema = z.object({
  userId: supportedIdSchema,
  tin: z.string().min(1),
  vrn: z.string().optional(),
  taxComplianceStatus: z.string().optional(),
  lastFiscalCheck: z.coerce.date().optional(),
  efdStatus: z.string().optional()
});

const marketRecordSchema = z.object({
  sellerId: supportedIdSchema,
  ethicalScore: z.number().min(0).max(100).optional(),
  qualityStatus: z.string().optional(),
  certifications: z.record(z.any()).optional(),
  lastAuditAt: z.coerce.date().optional()
});

export const createApp = (prisma: PrismaClient, eventBus: EventBus) => {
const app = express();
const complianceRepository = new PrismaComplianceRepository(prisma);

app.use(express.json());
app.use(i18nextMiddleware.handle(i18next));

// KYC Document Verification
app.post('/verify-document', async (req, res) => {
  const validated = parseOrRespond(verifyDocumentSchema, req.body, res);
  if (!validated) return;

  const { userId, documentType, documentUrl } = validated;
  const { sagaId } = req.body;

  try {
    const verification = await prisma.compliance_KYCRecord.create({
      data: { userId, documents: { type: documentType, url: documentUrl }, verificationStatus: 'pending' }
    });

    await eventBus.publish('DocumentUploadValidationStarted.v1', {
      userId, documentType, documentUrl, sagaId
    });

    const validationResult = { confidence: 0.85, extractedData: { name: 'John Doe' } };

    await eventBus.publish('AutomatedValidationCompleted.v1', {
      userId, documentType, validationResult, sagaId
    });

    res.json({ success: true, verificationId: verification.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Manual Review
app.post('/manual-review', async (req, res) => {
  const validated = parseOrRespond(manualReviewSchema, req.body, res);
  if (!validated) return;

  const { userId, decision, reviewerId } = validated;
  const { sagaId } = req.body;

  try {
    const eligibleStatuses = ['pending', 'under_review'] as const;
    const currentRecord = await prisma.compliance_KYCRecord.findFirst({
      where: {
        userId,
        verificationStatus: { in: [...eligibleStatuses] }
      },
      orderBy: { submittedAt: 'desc' }
    });

    if (!currentRecord) {
      return res.status(404).json({ success: false, error: 'No pending/under_review record found for user' });
    }

    const updateResult = await prisma.compliance_KYCRecord.updateMany({
      where: { id: currentRecord.id },
      data: { verificationStatus: decision, verifiedBy: reviewerId, verifiedAt: new Date() }
    });

    if (updateResult.count === 0) {
      return res.status(404).json({ success: false, error: 'No record updated for user' });
    }

    await eventBus.publish('KYCStatusChanged.v1', {
      userId,
      previousStatus: currentRecord.verificationStatus,
      newStatus: decision,
      changedBy: reviewerId,
      sagaId,
      timestamp: new Date().toISOString()
    });

    await eventBus.publish('ManualReviewCompleted.v1', { userId, decision, sagaId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Risk Assessment
app.post('/risk-assessment', async (req, res) => {
  const validated = parseOrRespond(riskAssessmentSchema, req.body, res);
  if (!validated) return;

  const { userId } = validated;
  const { sagaId } = req.body;

  try {
    const kycRecord = await prisma.compliance_KYCRecord.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' }
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const auditCount = await prisma.compliance_ComplianceAuditLog.count({
      where: {
        userId,
        timestamp: { gte: ninetyDaysAgo }
      }
    });

    const riskLevelMap = { low: 20, medium: 50, high: 80, critical: 90 };
    const baseScore = kycRecord ? riskLevelMap[kycRecord.riskLevel] : 50;
    const riskScore = Math.min(100, baseScore + auditCount * 2);

    const riskData = {
      transactionHistory: [],
      geographicRisk: 'low',
      industryRisk: 'medium'
    };

    await eventBus.publish('RiskDataCollected.v1', { userId, riskData, sagaId });
    await eventBus.publish('RiskScoreCalculated.v1', { userId, riskScore, sagaId });

    const complianceResult = {
      sanctionsCheck: 'clear',
      pepCheck: 'clear',
      adverseMediaCheck: 'clear'
    };

    await eventBus.publish('ComplianceCheckCompleted.v1', { userId, complianceResult, sagaId });

    const amlRecordId = await complianceRepository.upsertAmlRecord({
      userId,
      sanctionsStatus: complianceResult.sanctionsCheck,
      pepStatus: complianceResult.pepCheck !== 'clear',
      riskScore,
      flags: { complianceResult }
    });

    await eventBus.publish('AMLRecordUpdated.v1', {
      userId,
      amlRecordId,
      riskScore,
      sagaId
    });

    const riskDecision = riskScore > 80 ? 'reject' : 'accept';
    await eventBus.publish('RiskDecisionMade.v1', { userId, riskDecision, sagaId });

    res.json({ success: true, riskScore, decision: riskDecision });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Compliance Monitoring
app.post('/monitor', async (req, res) => {
  const validated = parseOrRespond(monitorSchema, req.body, res);
  if (!validated) return;

  const { complianceType, entityId, operation } = validated;
  const { sagaId } = req.body;

  try {
    const complianceResult = { status: 'compliant', score: 95.5 };

    await eventBus.publish('ComplianceCheckCompleted.v1', {
      complianceType, entityId, complianceResult, sagaId
    });

    await eventBus.publish('ComplianceRecorded.v1', {
      complianceType, entityId, operation, sagaId
    });

    res.json({ success: true, result: complianceResult });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Report Generation
app.post('/generate-report', async (req, res) => {
  const validated = parseOrRespond(generateReportSchema, req.body, res);
  if (!validated) return;

  const { reportType, requestedBy } = validated;
  const { sagaId } = req.body;

  try {
    const totalCount = await prisma.compliance_KYCRecord.count();
    const statusGroups = await prisma.compliance_KYCRecord.groupBy({
      by: ['verificationStatus'],
      _count: true
    });

    const getCount = (status: string) => {
      const group: any = statusGroups.find(g => g.verificationStatus === status);
      return group ? (typeof group._count === 'number' ? group._count : group._count?._all || 0) : 0;
    };

    const reportData = {
      kycVerifications: totalCount,
      approvedCount: getCount('approved'),
      rejectedCount: getCount('rejected'),
      pendingCount: getCount('pending'),
      under_reviewCount: getCount('under_review')
    };

    await eventBus.publish('ComplianceReportDataCollected.v1', {
      reportType, reportData, sagaId
    });

    const analysis = { overallScore: 96.2, trends: 'improving' };
    await eventBus.publish('ComplianceAnalysisCompleted.v1', {
      reportType, analysis, sagaId
    });

    const reportId = `compliance_${reportType}_${Date.now()}`;
    await eventBus.publish('ComplianceReportGenerated.v1', {
      reportType, reportId, sagaId
    });

    await eventBus.publish('ComplianceReportDistributed.v1', {
      reportType, requestedBy, sagaId
    });

    res.json({ success: true, reportId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Audit Log
app.post('/audit-log', async (req, res) => {
  const validated = parseOrRespond(auditLogSchema, req.body, res);
  if (!validated) return;

  const { userId, action, resource, resourceId } = validated;
  const { details, sagaId } = req.body;

  try {
    const auditLog = await prisma.compliance_ComplianceAuditLog.create({
      data: {
        userId,
        action,
        resource,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined
      }
    });

    await eventBus.publish('AuditLogRecorded.v1', {
      auditLogId: auditLog.id, userId, action, resource, sagaId
    });

    await eventBus.publish('AuditLogIndexed.v1', {
      userId, action, resource, sagaId
    });

    res.json({ success: true, auditLogId: auditLog.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// AML Record (manual update)
app.post('/aml-record', async (req, res) => {
  const validated = parseOrRespond(amlRecordSchema, req.body, res);
  if (!validated) return;

  const { userId, sanctionsStatus, pepStatus, riskScore, flags } = validated;
  const { sagaId } = req.body;

  try {
    const amlRecordId = await complianceRepository.upsertAmlRecord({
      userId,
      sanctionsStatus: sanctionsStatus ?? 'clear',
      pepStatus: pepStatus ?? false,
      riskScore: riskScore ?? 0,
      flags: flags ?? undefined
    });

    await eventBus.publish('AMLRecordUpdated.v1', {
      userId,
      amlRecordId,
      sagaId
    });

    res.status(201).json({ success: true, amlRecordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Subject Rights Request
app.post('/subject-rights-request', async (req, res) => {
  const validated = parseOrRespond(subjectRightsRequestSchema, req.body, res);
  if (!validated) return;

  const { userId, requestType, reason, payload } = validated;
  const { sagaId } = req.body;

  try {
    const requestId = await complianceRepository.createSubjectRightsRequest({
      userId,
      requestType,
      reason,
      payload
    });

    await eventBus.publish('SubjectRightsRequestCreated.v1', {
      requestId,
      userId,
      requestType,
      sagaId
    });

    res.status(201).json({ success: true, requestId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Data Deletion Log
app.post('/data-deletion-log', async (req, res) => {
  const validated = parseOrRespond(dataDeletionLogSchema, req.body, res);
  if (!validated) return;

  const { userId, dataType, recordsDeleted, requestedBy, reason } = validated;
  const { sagaId } = req.body;

  try {
    const logId = await complianceRepository.createDataDeletionLog({
      userId,
      dataType,
      recordsDeleted,
      requestedBy,
      reason
    });

    await eventBus.publish('DataDeletionLogged.v1', {
      logId,
      userId,
      dataType,
      recordsDeleted,
      sagaId
    });

    res.status(201).json({ success: true, logId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Data Retention Policy
app.post('/data-retention-policy', async (req, res) => {
  const validated = parseOrRespond(dataRetentionPolicySchema, req.body, res);
  if (!validated) return;

  const { dataType, retentionPeriod, legalBasis, applicableLaw, autoDelete, nextReviewDate } = validated;
  const { sagaId } = req.body;

  try {
    const policyId = await complianceRepository.upsertDataRetentionPolicy({
      dataType,
      retentionPeriod,
      legalBasis,
      applicableLaw,
      autoDelete,
      nextReviewDate
    });

    await eventBus.publish('DataRetentionPolicyUpdated.v1', {
      policyId,
      dataType,
      sagaId
    });

    res.status(201).json({ success: true, policyId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Data Processing Record
app.post('/data-processing-record', async (req, res) => {
  const validated = parseOrRespond(dataProcessingRecordSchema, req.body, res);
  if (!validated) return;

  const { purpose, categories, recipients, retentionPeriod, securityMeasures } = validated;
  const { sagaId } = req.body;

  try {
    const recordId = await complianceRepository.createDataProcessingRecord({
      purpose,
      categories,
      recipients,
      retentionPeriod,
      securityMeasures
    });

    await eventBus.publish('DataProcessingRecordCreated.v1', {
      recordId,
      purpose,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Privacy Impact Assessment
app.post('/privacy-impact-assessment', async (req, res) => {
  const validated = parseOrRespond(privacyImpactAssessmentSchema, req.body, res);
  if (!validated) return;

  const { projectName, assessor, riskLevel, findings, recommendations, status } = validated;
  const { sagaId } = req.body;

  try {
    const assessmentId = await complianceRepository.createPrivacyImpactAssessment({
      projectName,
      assessor,
      riskLevel,
      findings,
      recommendations,
      status
    });

    await eventBus.publish('PrivacyImpactAssessmentCreated.v1', {
      assessmentId,
      projectName,
      riskLevel,
      sagaId
    });

    res.status(201).json({ success: true, assessmentId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// TCRA Record
app.post('/tcra-record', async (req, res) => {
  const validated = parseOrRespond(tcraRecordSchema, req.body, res);
  if (!validated) return;

  const { userId, licenseNumber, status, registrationAt, expiryDate, lastAuditAt, auditFindings } = validated;
  const { sagaId } = req.body;

  try {
    const recordId = await complianceRepository.upsertTcraRecord({
      userId,
      licenseNumber,
      status,
      registrationAt,
      expiryDate,
      lastAuditAt,
      auditFindings
    });

    await eventBus.publish('TCRARecordUpdated.v1', {
      userId,
      recordId,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// TRA Record
app.post('/tra-record', async (req, res) => {
  const validated = parseOrRespond(traRecordSchema, req.body, res);
  if (!validated) return;

  const { userId, tin, vrn, taxComplianceStatus, lastFiscalCheck, efdStatus } = validated;
  const { sagaId } = req.body;

  try {
    const recordId = await complianceRepository.upsertTraRecord({
      userId,
      tin,
      vrn,
      taxComplianceStatus,
      lastFiscalCheck,
      efdStatus
    });

    await eventBus.publish('TRARecordUpdated.v1', {
      userId,
      recordId,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Market Record
app.post('/market-record', async (req, res) => {
  const validated = parseOrRespond(marketRecordSchema, req.body, res);
  if (!validated) return;

  const { sellerId, ethicalScore, qualityStatus, certifications, lastAuditAt } = validated;
  const { sagaId } = req.body;

  try {
    const recordId = await complianceRepository.upsertMarketRecord({
      sellerId,
      ethicalScore,
      qualityStatus,
      certifications,
      lastAuditAt
    });

    await eventBus.publish('MarketComplianceRecordUpdated.v1', {
      sellerId,
      recordId,
      sagaId
    });

    res.status(201).json({ success: true, recordId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Status Endpoint
app.get('/kyc-status/:userId', async (req, res) => {
  const validated = parseOrRespond(kycStatusParamSchema, req.params, res);
  if (!validated) return;

  const { userId } = validated;

  try {
    const record = await prisma.compliance_KYCRecord.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'KYC record not found' });
    }

    const tierMap = {
      pending: 0,
      submitted: 1,
      under_review: 1,
      approved: 2,
      rejected: 0,
      expired: 0
    };

    res.json({
      success: true,
      data: {
        userId: record.userId,
        kycTier: tierMap[record.verificationStatus],
        verificationStatus: record.verificationStatus,
        riskLevel: record.riskLevel,
        submittedAt: record.submittedAt,
        verifiedAt: record.verifiedAt,
        expiryDate: record.expiryDate
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

return app;
};

const PORT = process.env.PORT || 3013;
if (require.main === module) {
  const prisma = createPrismaClient();
  const app = createApp(prisma, eventBus);
  app.listen(PORT, () => console.log(`Compliance Service (KYC only) running on port ${PORT}`));
}

export default createApp(createPrismaClient(), eventBus);
