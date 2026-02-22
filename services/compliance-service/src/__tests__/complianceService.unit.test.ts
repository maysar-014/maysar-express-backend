import { createApp } from '../complianceService';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '../shared/events/eventBus';
import request from 'supertest';

const mockPrisma = {
    documentVerification: {
        create: jest.fn(),
        updateMany: jest.fn()
    },
    auditLog: {
        create: jest.fn()
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
            (mockPrisma.documentVerification.create as jest.Mock).mockResolvedValue({ id: 'ver-123' });

            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({ userId: 'u1', documentType: 'passport', documentUrl: 'url', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockEventBus.publish).toHaveBeenCalledWith('DocumentUploadValidationStarted.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('AutomatedValidationCompleted.v1', expect.any(Object));
        });

        it('should handle errors', async () => {
            (mockPrisma.documentVerification.create as jest.Mock).mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({ userId: 'u1', documentType: 'passport', documentUrl: 'url', sagaId: 's1' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/manual-review', () => {
        it('should complete manual review', async () => {
            (mockPrisma.documentVerification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/api/compliance/manual-review')
                .send({ userId: 'u1', decision: 'APPROVED', reviewerId: 'r1', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockEventBus.publish).toHaveBeenCalledWith('ManualReviewCompleted.v1', expect.any(Object));
        });
    });

    describe('POST /api/compliance/risk-assessment', () => {
        it('should perform risk assessment', async () => {
            const res = await request(app)
                .post('/api/compliance/risk-assessment')
                .send({ userId: 'u1', assessmentType: 'full', sagaId: 's1' });

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

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/generate-report', () => {
        it('should generate KYC report', async () => {
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

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/audit-log', () => {
        it('should create audit log', async () => {
            (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-123' });

            const res = await request(app)
                .post('/api/compliance/audit-log')
                .send({ userId: 'u1', action: 'view', resource: 'document', resourceId: 'd1', details: {}, sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.auditLogId).toBeDefined();
            expect(mockEventBus.publish).toHaveBeenCalledWith('AuditLogRecorded.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('AuditLogIndexed.v1', expect.any(Object));
        });
    });
});
