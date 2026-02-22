import express from 'express';
import { PrismaClient } from '@prisma/client';
import { eventBus, EventBus } from '../../../shared/events/eventBus';

export const createApp = (prisma: PrismaClient, eventBus: EventBus) => {
const app = express();

app.use(express.json());

// KYC Document Verification
app.post('/api/compliance/verify-document', async (req, res) => {
  const { userId, documentType, documentUrl, sagaId } = req.body;

  try {
    const verification = await prisma.documentVerification.create({
      data: { userId, documentType, documentUrl, status: 'PENDING' }
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
  const { userId, decision, reviewerId, sagaId } = req.body;

  try {
    await prisma.documentVerification.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: decision, reviewerId, reviewedAt: new Date() }
    });

    await eventBus.publish('ManualReviewCompleted.v1', { userId, decision, sagaId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KYC Risk Assessment
app.post('/api/compliance/risk-assessment', async (req, res) => {
  const { userId, assessmentType, sagaId } = req.body;

  try {
    const riskData = {
      transactionHistory: [],
      geographicRisk: 'low',
      industryRisk: 'medium'
    };

    await eventBus.publish('RiskDataCollected.v1', { userId, riskData, sagaId });

    const riskScore = Math.random() * 100;
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
  const { complianceType, entityId, operation, sagaId } = req.body;

  try {
    if (complianceType !== 'kyc') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only KYC compliance is supported' 
      });
    }

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
  const { reportType, period, requestedBy, sagaId } = req.body;

  try {
    if (reportType !== 'kyc') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only KYC reports are supported' 
      });
    }

    const reportData = {
      kycVerifications: 890,
      approvedCount: 850,
      rejectedCount: 40,
      pendingCount: 15
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
  const { userId, action, resource, resourceId, details, sagaId } = req.body;

  try {
    const auditLogId = `audit_${Date.now()}`;

    await prisma.auditLog.create({
      data: {
        id: auditLogId,
        userId,
        action,
        resource,
        resourceId,
        details: JSON.stringify(details),
        timestamp: new Date()
      }
    });

    await eventBus.publish('AuditLogRecorded.v1', {
      auditLogId, userId, action, resource, sagaId
    });

    await eventBus.publish('AuditLogIndexed.v1', {
      userId, action, resource, sagaId
    });

    res.json({ success: true, auditLogId });
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
