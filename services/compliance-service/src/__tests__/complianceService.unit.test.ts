import { createApp } from '../complianceService';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@shared-events/eventBus';
import request from 'supertest';

const mockPrisma = {
    compliance_KYCRecord: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn()
    },
    compliance_AMLRecord: {
        upsert: jest.fn()
    },
    compliance_ComplianceAuditLog: {
        create: jest.fn(),
        count: jest.fn()
    }
} as unknown as PrismaClient;

const mockEventBus = {
    publish: jest.fn()
} as unknown as EventBus;

const validUserId = 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const validReviewerId = 'usr_01BX5ZZKBKACTAV9WEVGEMMVRZ';

describe('complianceService', () => {
    let app: ReturnType<typeof createApp>;
    let mockDocumentStorage: {
        getConstraints: jest.Mock;
        storeDocument: jest.Mock;
        resolveDocumentAccess: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDocumentStorage = {
            getConstraints: jest.fn().mockReturnValue({
                maxFileSizeBytes: 5 * 1024 * 1024,
                allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
            }),
            storeDocument: jest.fn(),
            resolveDocumentAccess: jest.fn()
        };
        app = createApp(mockPrisma, mockEventBus, {
            documentStorage: mockDocumentStorage as any
        });
    });

    describe('POST /verify-document', () => {
        it('should verify document and publish events', async () => {
            (mockPrisma.compliance_KYCRecord.create as jest.Mock).mockResolvedValue({ id: 'ver-123' });

            const res = await request(app)
                .post('/verify-document')
                .send({ userId: validUserId, documentType: 'passport', documentUrl: 'https://example.com/doc.pdf', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockEventBus.publish).toHaveBeenCalledWith('DocumentUploadValidationStarted.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('AutomatedValidationCompleted.v1', expect.any(Object));
        });

        it('should reject invalid userId', async () => {
            const res = await request(app)
                .post('/verify-document')
                .send({ userId: 'invalid', documentType: 'passport', documentUrl: 'https://example.com/doc.pdf' });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('should require either documentUrl or fileUrl', async () => {
            const res = await request(app)
                .post('/verify-document')
                .send({ userId: validUserId, documentType: 'passport', sagaId: 's1' });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: 'documentUrl or fileUrl is required',
                        path: ['documentUrl']
                    })
                ])
            );
        });

        it('should handle errors', async () => {
            (mockPrisma.compliance_KYCRecord.create as jest.Mock).mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .post('/verify-document')
                .send({ userId: validUserId, documentType: 'passport', documentUrl: 'https://example.com/doc.pdf', sagaId: 's1' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /kyc/submissions', () => {
        it('should create a richer KYC submission from fileUrl metadata', async () => {
            (mockPrisma.compliance_KYCRecord.create as jest.Mock).mockResolvedValue({
                id: 'sub-123',
                verificationStatus: 'pending',
                submittedAt: new Date('2026-03-23T10:00:00.000Z')
            });

            const res = await request(app)
                .post('/kyc/submissions')
                .send({
                    userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                    documentType: 'passport',
                    fileUrl: 'https://example.com/passport.pdf',
                    fileName: 'passport.pdf',
                    mimeType: 'application/pdf',
                    fileSizeBytes: 24576
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.submissionId).toBe('sub-123');
            expect(res.body.data.documentUrl).toBe('https://example.com/passport.pdf');
            expect(mockPrisma.compliance_KYCRecord.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                        verificationStatus: 'pending',
                        documents: expect.objectContaining({
                            type: 'passport',
                            url: 'https://example.com/passport.pdf',
                            fileName: 'passport.pdf',
                            mimeType: 'application/pdf',
                            fileSizeBytes: 24576
                        })
                    })
                })
            );
        });

        it('should reject sagaId on the public KYC submission endpoint', async () => {
            const res = await request(app)
                .post('/kyc/submissions')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    fileUrl: 'https://example.com/passport.pdf',
                    sagaId: 's2'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('should reject too-short documentNumber', async () => {
            const res = await request(app)
                .post('/kyc/submissions')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    fileUrl: 'https://example.com/passport.pdf',
                    documentNumber: '00'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('should reject metadata: null on submissions', async () => {
            const res = await request(app)
                .post('/kyc/submissions')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    fileUrl: 'https://example.com/passport.pdf',
                    metadata: null
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('should reject multipart metadata sent as a JSON string on submissions', async () => {
            const res = await request(app)
                .post('/kyc/submissions')
                .field('userId', validUserId)
                .field('documentType', 'passport')
                .field('mimeType', 'application/pdf')
                .field('metadata', '{}')
                .attach('file', Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'), {
                    filename: 'passport.pdf',
                    contentType: 'application/pdf'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /kyc/documents', () => {
        it('should expose the upload-style alias for KYC submissions', async () => {
            (mockPrisma.compliance_KYCRecord.create as jest.Mock).mockResolvedValue({
                id: 'sub-456',
                verificationStatus: 'pending',
                submittedAt: new Date('2026-03-23T10:00:00.000Z')
            });

            const res = await request(app)
                .post('/kyc/documents')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    documentUrl: 'https://example.com/passport.pdf',
                    fileName: 'passport.pdf',
                    mimeType: 'application/pdf'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.submissionId).toBe('sub-456');
            expect(res.body.data.documentUrl).toBe('https://example.com/passport.pdf');
        });

        it('should upload multipart documents into managed storage before persisting KYC submission', async () => {
            mockDocumentStorage.storeDocument.mockResolvedValue({
                provider: 's3',
                bucket: 'kyc-private',
                key: 'kyc/usr_01/passport/abc-passport.pdf',
                url: 's3://kyc-private/kyc/usr_01/passport/abc-passport.pdf',
                fileName: 'passport.pdf',
                mimeType: 'application/pdf',
                fileSizeBytes: 14,
                checksumSha256: 'abc123',
                uploadedAt: '2026-03-23T10:00:00.000Z'
            });
            (mockPrisma.compliance_KYCRecord.create as jest.Mock).mockResolvedValue({
                id: 'sub-789',
                verificationStatus: 'pending',
                submittedAt: new Date('2026-03-23T10:00:00.000Z')
            });

            const res = await request(app)
                .post('/kyc/documents')
                .field('userId', validUserId)
                .field('documentType', 'passport')
                .field('mimeType', 'application/pdf')
                .attach('file', Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'), {
                    filename: 'passport.pdf',
                    contentType: 'application/pdf'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.documentUrl).toBe('s3://kyc-private/kyc/usr_01/passport/abc-passport.pdf');
            expect(res.body.data.documentAccessUrl).toBe('/kyc/documents/sub-789/content');
            expect(res.body.data.storageProvider).toBe('s3');
            expect(mockDocumentStorage.storeDocument).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: validUserId,
                    documentType: 'passport',
                    originalFileName: 'passport.pdf',
                    mimeType: 'application/pdf'
                })
            );
            expect(mockPrisma.compliance_KYCRecord.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        documents: expect.objectContaining({
                            storageProvider: 's3',
                            storageBucket: 'kyc-private',
                            storageKey: 'kyc/usr_01/passport/abc-passport.pdf',
                            checksumSha256: 'abc123'
                        })
                    })
                })
            );
        });

        it('should reject multipart submissions when fileSizeBytes does not match uploaded file size', async () => {
            const res = await request(app)
                .post('/kyc/documents')
                .field('userId', validUserId)
                .field('documentType', 'passport')
                .field('mimeType', 'application/pdf')
                .field('fileSizeBytes', '1')
                .attach('file', Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'), {
                    filename: 'passport.pdf',
                    contentType: 'application/pdf'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        message: 'fileSizeBytes must match uploaded file size',
                        path: ['fileSizeBytes']
                    })
                ])
            );
            expect(mockDocumentStorage.storeDocument).not.toHaveBeenCalled();
        });

        it('should reject metadata: null on the documents alias', async () => {
            const res = await request(app)
                .post('/kyc/documents')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    documentUrl: 'https://example.com/passport.pdf',
                    metadata: null
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(mockDocumentStorage.storeDocument).not.toHaveBeenCalled();
        });

        it('should reject multipart metadata when sent as a JSON string', async () => {
            const res = await request(app)
                .post('/kyc/documents')
                .field('userId', validUserId)
                .field('documentType', 'passport')
                .field('mimeType', 'application/pdf')
                .field('metadata', '{}')
                .attach('file', Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'), {
                    filename: 'passport.pdf',
                    contentType: 'application/pdf'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
            expect(mockDocumentStorage.storeDocument).not.toHaveBeenCalled();
        });

        it('should reject malformed multipart payloads without escaping the route boundary', async () => {
            const res = await request(app)
                .post('/kyc/documents')
                .set('Content-Type', 'multipart/form-data; boundary=bad-boundary')
                .send([
                    '--bad-boundary',
                    'Content-Disposition: form-data; name="userId"',
                    '',
                    validUserId,
                    '--bad-boundary'
                ].join('\r\n'));

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Malformed multipart form data');
            expect(mockDocumentStorage.storeDocument).not.toHaveBeenCalled();
        });

        it('should reject sagaId on the public KYC documents endpoint', async () => {
            const res = await request(app)
                .post('/kyc/documents')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    fileUrl: 'https://example.com/passport.pdf',
                    sagaId: 's-public'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });

        it('should reject too-short documentNumber', async () => {
            const res = await request(app)
                .post('/kyc/documents')
                .send({
                    userId: validUserId,
                    documentType: 'passport',
                    fileUrl: 'https://example.com/passport.pdf',
                    documentNumber: '00'
                });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /kyc/documents/:verificationId/content', () => {
        it('should redirect to a signed access URL for bucket-backed documents', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({
                id: 'cmp_kyc_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                userId: validUserId,
                documents: {
                    url: 's3://kyc-private/kyc/usr_01/passport/abc-passport.pdf',
                    fileName: 'passport.pdf',
                    mimeType: 'application/pdf',
                    fileSizeBytes: 24576,
                    storageProvider: 's3',
                    storageBucket: 'kyc-private',
                    storageKey: 'kyc/usr_01/passport/abc-passport.pdf',
                    checksumSha256: 'abc123',
                    uploadedAt: '2026-03-23T10:00:00.000Z'
                }
            });
            mockDocumentStorage.resolveDocumentAccess.mockResolvedValue({
                kind: 'redirect',
                url: 'https://signed.example.com/passport.pdf',
                expiresAt: '2026-03-23T10:15:00.000Z'
            });

            const res = await request(app)
                .get('/kyc/documents/cmp_kyc_01ARZ3NDEKTSV4RRFFQ69G5FAV/content')
                .redirects(0);

            expect(res.status).toBe(302);
            expect(res.headers.location).toBe('https://signed.example.com/passport.pdf');
            expect(mockDocumentStorage.resolveDocumentAccess).toHaveBeenCalledWith(
                expect.objectContaining({
                    provider: 's3',
                    bucket: 'kyc-private',
                    key: 'kyc/usr_01/passport/abc-passport.pdf'
                })
            );
        });
    });

    describe('POST /manual-review', () => {
        it('should approve a pending record via admin manual review', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({
                id: 'kyc-record-1',
                verificationStatus: 'pending'
            });
            (mockPrisma.compliance_KYCRecord.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/manual-review')
                .send({
                    userId: validUserId,
                    decision: 'approved',
                    reviewerId: validReviewerId,
                    sagaId: 's-1'
                });

            expect(res.status).toBe(200);
            expect(mockPrisma.compliance_KYCRecord.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'kyc-record-1' },
                    data: expect.objectContaining({
                        verificationStatus: 'approved',
                        verifiedBy: validReviewerId
                    })
                })
            );
            expect(mockEventBus.publish).toHaveBeenCalledWith(
                'KYCStatusChanged.v1',
                expect.objectContaining({
                    previousStatus: 'pending',
                    newStatus: 'approved'
                })
            );
        });

        it('should complete manual review and emit KYCStatusChanged event', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({ verificationStatus: 'under_review' });
            (mockPrisma.compliance_KYCRecord.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/manual-review')
                .send({ userId: validUserId, decision: 'approved', reviewerId: validReviewerId, sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockEventBus.publish).toHaveBeenCalledWith('KYCStatusChanged.v1', expect.objectContaining({
                userId: validUserId,
                newStatus: 'approved'
            }));
            expect(mockEventBus.publish).toHaveBeenCalledWith('ManualReviewCompleted.v1', expect.any(Object));
        });

        it('should reject invalid decision', async () => {
            const res = await request(app)
                .post('/manual-review')
                .send({ userId: validUserId, decision: 'invalid', reviewerId: validReviewerId });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /risk-assessment', () => {
        it('should perform risk assessment with real DB data', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({ riskLevel: 'medium' });
            (mockPrisma.compliance_ComplianceAuditLog.count as jest.Mock).mockResolvedValue(5);
            (mockPrisma.compliance_AMLRecord.upsert as jest.Mock).mockResolvedValue({ id: 'aml-123' });

            const res = await request(app)
                .post('/risk-assessment')
                .send({ userId: validUserId, assessmentType: 'full', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.riskScore).toBeDefined();
            expect(mockEventBus.publish).toHaveBeenCalledWith('RiskDataCollected.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('RiskScoreCalculated.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('ComplianceCheckCompleted.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('RiskDecisionMade.v1', expect.any(Object));
        });
    });

    describe('POST /monitor', () => {
        it('should monitor KYC compliance', async () => {
            const res = await request(app)
                .post('/monitor')
                .send({ complianceType: 'kyc', entityId: 'e1', operation: 'check', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.result.status).toBe('compliant');
        });

        it('should reject non-KYC compliance types', async () => {
            const res = await request(app)
                .post('/monitor')
                .send({ complianceType: 'aml', entityId: 'e1', operation: 'check', sagaId: 's1' });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /generate-report', () => {
        it('should generate KYC report with real DB data', async () => {
            (mockPrisma.compliance_KYCRecord.count as jest.Mock).mockResolvedValue(100);
            (mockPrisma.compliance_KYCRecord.groupBy as jest.Mock).mockResolvedValue([
                { verificationStatus: 'approved', _count: 80 },
                { verificationStatus: 'rejected', _count: 10 },
                { verificationStatus: 'pending', _count: 10 }
            ]);

            const res = await request(app)
                .post('/generate-report')
                .send({ reportType: 'kyc', period: 'monthly', requestedBy: 'admin', sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.reportId).toBeDefined();
            expect(mockEventBus.publish).toHaveBeenCalledWith('ComplianceReportDataCollected.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('ComplianceReportGenerated.v1', expect.any(Object));
        });

        it('should reject non-KYC report types', async () => {
            const res = await request(app)
                .post('/generate-report')
                .send({ reportType: 'aml', period: 'monthly', requestedBy: 'admin', sagaId: 's1' });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /audit-log', () => {
        it('should create audit log', async () => {
            (mockPrisma.compliance_ComplianceAuditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-123' });

            const res = await request(app)
                .post('/audit-log')
                .send({ userId: validUserId, action: 'view', resource: 'document', resourceId: 'd1', details: {}, sagaId: 's1' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.auditLogId).toBeDefined();
            expect(mockEventBus.publish).toHaveBeenCalledWith('AuditLogRecorded.v1', expect.any(Object));
            expect(mockEventBus.publish).toHaveBeenCalledWith('AuditLogIndexed.v1', expect.any(Object));
        });
    });

    describe('GET /kyc-status/:userId', () => {
        it('should return KYC status with tier mapping', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue({
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
            expect(res.body.data.verificationStatus).toBe('approved');
        });

        it('should return 404 when record not found', async () => {
            (mockPrisma.compliance_KYCRecord.findFirst as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .get(`/kyc-status/${validUserId}`);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it('should reject invalid userId', async () => {
            const res = await request(app)
                .get('/kyc-status/invalid');

            expect(res.status).toBe(422);
        });
    });
});
