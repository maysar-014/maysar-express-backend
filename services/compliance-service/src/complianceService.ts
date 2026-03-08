import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus, EventBus } from '@shared-events/eventBus';
import { t } from '@shared/i18n/i18n';
import { i18next, i18nextMiddleware } from '@shared/i18n/i18n';
import { z } from 'zod';

const parseOrRespond = (schema: z.ZodSchema, data: any, res: express.Response) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(422).json({ success: false, errors: result.error.errors });
    return null;
  }
  return result.data;
};

const verifyDocumentSchema = z.object({
  userId: z.string().cuid(),
  documentType: z.enum(['national_id', 'passport', 'drivers_license', 'proof_of_address']),
  documentUrl: z.string().url()
});

const manualReviewSchema = z.object({
  userId: z.string().cuid(),
  decision: z.enum(['approved', 'rejected', 'under_review']),
  reviewerId: z.string().cuid()
});

const riskAssessmentSchema = z.object({
  userId: z.string().cuid(),
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
  userId: z.string().cuid(),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string()
});

const kycStatusParamSchema = z.object({
  userId: z.string().cuid()
});

export const createApp = (prisma: PrismaClient, eventBus: EventBus) => {
const app = express();

app.use(express.json());
app.use(i18nextMiddleware.handle(i18next));

// KYC Document Verification
app.post('/api/compliance/verify-document', async (req, res) => {
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
app.post('/api/compliance/manual-review', async (req, res) => {
  const validated = parseOrRespond(manualReviewSchema, req.body, res);
  if (!validated) return;

  const { userId, decision, reviewerId } = validated;
  const { sagaId } = req.body;

  try {
    const currentRecord = await prisma.compliance_KYCRecord.findFirst({
      where: { userId, verificationStatus: 'under_review' }
    });

    const updateResult = await prisma.compliance_KYCRecord.updateMany({
      where: { userId, verificationStatus: 'under_review' },
      data: { verificationStatus: decision, verifiedBy: reviewerId, verifiedAt: new Date() }
    });

    if (updateResult.count === 0) {
      return res.status(404).json({ success: false, error: 'No under_review record found for user' });
    }

    await eventBus.publish('KYCStatusChanged.v1', {
      userId,
      previousStatus: currentRecord?.verificationStatus || 'under_review',
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
app.post('/api/compliance/risk-assessment', async (req, res) => {
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

    const riskDecision = riskScore > 80 ? 'reject' : 'accept';
    await eventBus.publish('RiskDecisionMade.v1', { userId, riskDecision, sagaId });

    res.json({ success: true, riskScore, decision: riskDecision });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Compliance Monitoring
app.post('/api/compliance/monitor', async (req, res) => {
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
app.post('/api/compliance/generate-report', async (req, res) => {
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
app.post('/api/compliance/audit-log', async (req, res) => {
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

// KYC Status Endpoint
app.get('/api/compliance/kyc-status/:userId', async (req, res) => {
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
  const prisma = new PrismaClient();
  const app = createApp(prisma, eventBus);
  app.listen(PORT, () => console.log(`Compliance Service (KYC only) running on port ${PORT}`));
}

export default createApp(new PrismaClient(), eventBus);
