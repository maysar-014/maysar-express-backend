import request from 'supertest';
import { createApp } from '../complianceService';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '../../../shared/events/eventBus';

jest.mock('@prisma/client');
jest.mock('../../../shared/events/eventBus');

describe('KYC ComplianceService API', () => {
    let prismaMock: any;
    let eventBusMock: any;
    let app: any;

    beforeEach(() => {
        prismaMock = {
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
        };
        eventBusMock = {
            publish: jest.fn().mockResolvedValue(undefined)
        };
        (PrismaClient as any).mockImplementation(() => prismaMock);
        app = createApp(prismaMock, eventBusMock);
    });

    describe('POST /api/compliance/verify-document', () => {
        it('should create KYC verification and return success', async () => {
            prismaMock.compliance_KYCRecord.create.mockResolvedValue({ id: 'v-1' });

            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({
                    userId: 'cltest123456789',
                    documentType: 'passport',
                    documentUrl: 'https://docs.com/p.jpg',
                    sagaId: 's-1'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(prismaMock.compliance_KYCRecord.create).toHaveBeenCalled();
        });

        it('should reject invalid userId', async () => {
            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({
                    userId: 'invalid',
                    documentType: 'passport',
                    documentUrl: 'https://docs.com/p.jpg'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/manual-review', () => {
        it('should emit KYCStatusChanged when record is updated', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue({ verificationStatus: 'under_review' });
            prismaMock.compliance_KYCRecord.updateMany.mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/api/compliance/manual-review')
                .send({
                    userId: 'cltest123456789',
                    decision: 'approved',
                    reviewerId: 'clreview12345678',
                    sagaId: 's-1'
                });

            expect(res.status).toBe(200);
            expect(eventBusMock.publish).toHaveBeenCalledWith('KYCStatusChanged.v1', expect.any(Object));
        });

        it('should return 404 when no under_review record exists', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue(null);
            prismaMock.compliance_KYCRecord.updateMany.mockResolvedValue({ count: 0 });

            const res = await request(app)
                .post('/api/compliance/manual-review')
                .send({
                    userId: 'cltest123456789',
                    decision: 'approved',
                    reviewerId: 'clreview12345678'
                });

            expect(res.status).toBe(404);
            expect(eventBusMock.publish).not.toHaveBeenCalledWith('KYCStatusChanged.v1', expect.any(Object));
        });
    });

    describe('POST /api/compliance/monitor', () => {
        it('should only accept KYC compliance type', async () => {
            const res = await request(app)
                .post('/api/compliance/monitor')
                .send({
                    complianceType: 'kyc',
                    entityId: 'entity-1',
                    operation: 'verify',
                    sagaId: 's-2'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should reject non-KYC compliance types', async () => {
            const res = await request(app)
                .post('/api/compliance/monitor')
                .send({
                    complianceType: 'gdpr',
                    entityId: 'entity-1',
                    operation: 'verify',
                    sagaId: 's-3'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/compliance/generate-report', () => {
        it('should generate KYC report with real DB data', async () => {
            prismaMock.compliance_KYCRecord.count.mockResolvedValue(100);
            prismaMock.compliance_KYCRecord.groupBy.mockResolvedValue([
                { verificationStatus: 'approved', _count: { _all: 80 } },
                { verificationStatus: 'rejected', _count: { _all: 10 } },
                { verificationStatus: 'pending', _count: { _all: 10 } }
            ]);

            const res = await request(app)
                .post('/api/compliance/generate-report')
                .send({
                    reportType: 'kyc',
                    period: '2023-Q4',
                    requestedBy: 'admin-1',
                    sagaId: 's-4'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.reportId).toBeDefined();
        });

        it('should reject non-KYC report types', async () => {
            const res = await request(app)
                .post('/api/compliance/generate-report')
                .send({
                    reportType: 'gdpr',
                    period: '2023-Q4',
                    requestedBy: 'admin-1',
                    sagaId: 's-5'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/compliance/kyc-status/:userId', () => {
        it('should return KYC status with tier mapping', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue({
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
        });

        it('should return 404 when record not found', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/compliance/kyc-status/cltest123456789');

            expect(res.status).toBe(404);
        });

        it('should reject invalid userId', async () => {
            const res = await request(app)
                .get('/api/compliance/kyc-status/invalid');

            expect(res.status).toBe(422);
        });
    });
});
