import request from 'supertest';
import { createApp } from '../../complianceService';

describe('Compliance Service Integration', () => {
  it('accepts KYC compliance monitoring workflow and publishes events', async () => {
    const prisma = {
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
    } as any;

    const publisher = {
      publish: jest.fn().mockResolvedValue(undefined)
    } as any;

    const app = createApp(prisma, publisher);

    const response = await request(app).post('/api/compliance/monitor').send({
      complianceType: 'kyc',
      entityId: 'entity-1',
      operation: 'verify',
      sagaId: 'saga-1'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(publisher.publish).toHaveBeenCalledTimes(2);
  });
});

