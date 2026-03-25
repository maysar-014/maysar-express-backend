import request from 'supertest';
import { createApp } from '../complianceService';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@shared-events/eventBus';

jest.mock('@prisma/client');
jest.mock('@shared-events/eventBus');

const validUserId = 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const validReviewerId = 'usr_01BX5ZZKBKACTAV9WEVGEMMVRZ';

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

    describe('POST /verify-document', () => {
        it('should create KYC verification and return success', async () => {
            prismaMock.compliance_KYCRecord.create.mockResolvedValue({ id: 'v-1' });

            const res = await request(app)
                .post('/verify-document')
                .send({
                    userId: validUserId,
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
                .post('/verify-document')
                .send({
                    userId: 'invalid',
                    documentType: 'passport',
                    documentUrl: 'https://docs.com/p.jpg'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /kyc/documents', () => {
        it('should mirror KYC submission behavior on the documents alias', async () => {
            prismaMock.compliance_KYCRecord.create.mockResolvedValue({
                id: 'v-2',
                verificationStatus: 'pending',
                submittedAt: new Date('2026-03-23T10:00:00.000Z')
            });

            const res = await request(app)
                .post('/kyc/documents')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    fileUrl: 'https://docs.com/p.jpg'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.documentUrl).toBe('https://docs.com/p.jpg');
        });
    });

    describe('POST /manual-review', () => {
        it('should approve a pending record via admin manual review', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue({
                id: 'kyc-record-1',
                verificationStatus: 'pending'
            });
            prismaMock.compliance_KYCRecord.updateMany.mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/manual-review')
                .send({
                    userId: validUserId,
                    decision: 'approved',
                    reviewerId: validReviewerId,
                    sagaId: 's-1'
                });

            expect(res.status).toBe(200);
            expect(prismaMock.compliance_KYCRecord.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'kyc-record-1' },
                    data: expect.objectContaining({
                        verificationStatus: 'approved',
                        verifiedBy: validReviewerId
                    })
                })
            );
            expect(eventBusMock.publish).toHaveBeenCalledWith(
                'KYCStatusChanged.v1',
                expect.objectContaining({
                    previousStatus: 'pending',
                    newStatus: 'approved'
                })
            );
        });

        it('should emit KYCStatusChanged when record is updated', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue({ verificationStatus: 'under_review' });
            prismaMock.compliance_KYCRecord.updateMany.mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/manual-review')
                .send({
                    userId: validUserId,
                    decision: 'approved',
                    reviewerId: validReviewerId,
                    sagaId: 's-1'
                });

            expect(res.status).toBe(200);
            expect(eventBusMock.publish).toHaveBeenCalledWith('KYCStatusChanged.v1', expect.any(Object));
        });

        it('should return 404 when no under_review record exists', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue(null);
            prismaMock.compliance_KYCRecord.updateMany.mockResolvedValue({ count: 0 });

            const res = await request(app)
                .post('/manual-review')
                .send({
                    userId: validUserId,
                    decision: 'approved',
                    reviewerId: validReviewerId
                });

            expect(res.status).toBe(404);
            expect(eventBusMock.publish).not.toHaveBeenCalledWith('KYCStatusChanged.v1', expect.any(Object));
        });
    });

    describe('POST /monitor', () => {
        it('should only accept KYC compliance type', async () => {
            const res = await request(app)
                .post('/monitor')
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
                .post('/monitor')
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

    describe('POST /generate-report', () => {
        it('should generate KYC report with real DB data', async () => {
            prismaMock.compliance_KYCRecord.count.mockResolvedValue(100);
            prismaMock.compliance_KYCRecord.groupBy.mockResolvedValue([
                { verificationStatus: 'approved', _count: { _all: 80 } },
                { verificationStatus: 'rejected', _count: { _all: 10 } },
                { verificationStatus: 'pending', _count: { _all: 10 } }
            ]);

            const res = await request(app)
                .post('/generate-report')
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
                .post('/generate-report')
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

    describe('GET /kyc-status/:userId', () => {
        it('should return KYC status with tier mapping', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue({
                userId: validUserId,
                verificationStatus: 'approved',
                riskLevel: 'low',
                submittedAt: new Date(),
                verifiedAt: new Date(),
                expiryDate: null
            });

            const res = await request(app)
                .get(`/kyc-status/${validUserId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.kycTier).toBe(2);
        });

        it('should return 404 when record not found', async () => {
            prismaMock.compliance_KYCRecord.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .get(`/kyc-status/${validUserId}`);

            expect(res.status).toBe(404);
        });

        it('should reject invalid userId', async () => {
            const res = await request(app)
                .get('/kyc-status/invalid');

            expect(res.status).toBe(422);
        });
    });
});
