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
            documentVerification: {
                create: jest.fn(),
                updateMany: jest.fn()
            },
            auditLog: {
                create: jest.fn()
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
            prismaMock.documentVerification.create.mockResolvedValue({ id: 'v-1' });

            const res = await request(app)
                .post('/api/compliance/verify-document')
                .send({
                    userId: 'user-1',
                    documentType: 'passport',
                    documentUrl: 'http://docs.com/p.jpg',
                    sagaId: 's-1'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(prismaMock.documentVerification.create).toHaveBeenCalled();
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

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('Only KYC compliance is supported');
        });
    });

    describe('POST /api/compliance/generate-report', () => {
        it('should generate KYC report', async () => {
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

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('Only KYC reports are supported');
        });
    });
});
