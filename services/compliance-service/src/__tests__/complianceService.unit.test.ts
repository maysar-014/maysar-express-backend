import { createApp } from '../complianceService';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '../../../../shared/events/eventBus';
import request from 'supertest';

const mockPrisma = {
    compliance_KYCRecord: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn()
    },
    compliance_ComplianceAuditLog: {
        create: jest.fn(),
        count: jest.fn()
    }
} as unknown as PrismaClient;

const mockEventBus = {
    publish: jest.fn()
} as unknown as EventBus;

describe('complianceService', () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(() => {
        jest.clearAllMocks();
        app = createApp(mockPrisma, mockEventBus);
    });

    describe('POST /api/compliance/verify-document', () => {
        it('should verify document and publish events', async () => {
            (mockPrisma.compliance_KYCRecord.create as jest.Mock).mockResolvedValue({ id: 'ver-123' });

            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({ userId: 'cltest123456789', documentType: 'passport', documentUrl: 'https://example.com/doc.pdf', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockEventBus.publish).toHaveBeenCalledWith('DocumentUploadValidationStarted.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('AutomatedValidationCompleted.v1', expect.any(Object));
        });

        it('should reject invalid userId', async () => {
            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({ userId: 'invalid', documentType: 'passport', documentUrl: 'https://example.com/doc.pdf' });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('should handle errors', async () => {
            (mockPrisma.compliance_KYCRecord.create as jest.Mock).mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({ userId: 'cltest123456789', documentType: 'passport', documentUrl: 'https://example.com/doc.pdf', sagaId: 's1' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/manual-review', () => {
        it('should complete manual review and emit KYCStatusChanged event', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({ verificationStatus: 'under_review' });
            (mockPrisma.compliance_KYCRecord.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/api/compliance/manual-review')
                .send({ userId: 'cltest123456789', decision: 'approved', reviewerId: 'clreview12345678', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockEventBus.publish).toHaveBeenCalledWith('KYCStatusChanged.v1', expect.objectContaining({
                userId: 'cltest123456789',
                newStatus: 'approved'
            }));
            expect(mockEventBus.publish).toHaveBeenCalledWith('ManualReviewCompleted.v1', expect.any(Object));
        });

        it('should reject invalid decision', async () => {
            const res = await request(app)
                .post('/api/compliance/manual-review')
                .send({ userId: 'cltest123456789', decision: 'invalid', reviewerId: 'clreview12345678' });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /api/compliance/risk-assessment', () => {
        it('should perform risk assessment with real DB data', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({ riskLevel: 'medium' });
            (mockPrisma.compliance_ComplianceAuditLog.count as jest.Mock).mockResolvedValue(5);

            const res = await request(app)
                .post('/api/compliance/risk-assessment')
                .send({ userId: 'cltest123456789', assessmentType: 'full', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.riskScore).toBeDefined();
            expect(mockEventBus.publish).toHaveBeenCalledWith('RiskDataCollected.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('RiskScoreCalculated.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('ComplianceCheckCompleted.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('RiskDecisionMade.v1', expect.any(Object));
        });
    });

    describe('POST /api/compliance/monitor', () => {
        it('should monitor KYC compliance', async () => {
            const res = await request(app)
                .post('/api/compliance/monitor')
                .send({ complianceType: 'kyc', entityId: 'e1', operation: 'check', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.result.status).toBe('compliant');
        });

        it('should reject non-KYC compliance types', async () => {
            const res = await request(app)
                .post('/api/compliance/monitor')
                .send({ complianceType: 'aml', entityId: 'e1', operation: 'check', sagaId: 's1' });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/generate-report', () => {
        it('should generate KYC report with real DB data', async () => {
            (mockPrisma.compliance_KYCRecord.count as jest.Mock).mockResolvedValue(100);
            (mockPrisma.compliance_KYCRecord.groupBy as jest.Mock).mockResolvedValue([
                { verificationStatus: 'approved', _count: 80 },
                { verificationStatus: 'rejected', _count: 10 },
                { verificationStatus: 'pending', _count: 10 }
            ]);

            const res = await request(app)
                .post('/api/compliance/generate-report')
                .send({ reportType: 'kyc', period: 'monthly', requestedBy: 'admin', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.reportId).toBeDefined();
            expect(mockEventBus.publish).toHaveBeenCalledWith('ComplianceReportDataCollected.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('ComplianceReportGenerated.v1', expect.any(Object));
        });

        it('should reject non-KYC report types', async () => {
            const res = await request(app)
                .post('/api/compliance/generate-report')
                .send({ reportType: 'aml', period: 'monthly', requestedBy: 'admin', sagaId: 's1' });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/audit-log', () => {
        it('should create audit log', async () => {
            (mockPrisma.compliance_ComplianceAuditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-123' });

            const res = await request(app)
                .post('/api/compliance/audit-log')
                .send({ userId: 'cltest123456789', action: 'view', resource: 'document', resourceId: 'd1', details: {}, sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.auditLogId).toBeDefined();
            expect(mockEventBus.publish).toHaveBeenCalledWith('AuditLogRecorded.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('AuditLogIndexed.v1', expect.any(Object));
        });
    });

    describe('GET /api/compliance/kyc-status/:userId', () => {
        it('should return KYC status with tier mapping', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({
                userId: 'cltest123456789',
                verificationStatus: 'approved',
                riskLevel: 'low',
                submittedAt: new Date(),
                verifiedAt: new Date(),
                expiryDate: null
            });

            const res = await request(app)
                .get('/api/compliance/kyc-status/cltest123456789');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.kycTier).toBe(2);
            expect(res.body.data.verificationStatus).toBe('approved');
        });

        it('should return 404 when record not found', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .get('/api/compliance/kyc-status/cltest123456789');

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it('should reject invalid userId', async () => {
            const res = await request(app)
                .get('/api/compliance/kyc-status/invalid');

            expect(res.status).toBe(422);
        });
    });
});
