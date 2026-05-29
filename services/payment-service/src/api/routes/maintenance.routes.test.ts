import express from 'express';
import request from 'supertest';

const mockPrisma = {
  payment_OutboxEvent: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  }
};

jest.mock('../../container', () => ({
  Container: {
    getInstance: jest.fn(() => ({
      prisma: mockPrisma
    }))
  }
}));

import { createMaintenanceRoutes } from './maintenance.routes';

describe('payment maintenance routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ALLOWED_SERVICE_KEYS: 'svc-1,svc-2' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns outbox cleanup reports and performs dry-run cleanup', async () => {
    mockPrisma.payment_OutboxEvent.count.mockResolvedValueOnce(6).mockResolvedValueOnce(2);
    mockPrisma.payment_OutboxEvent.findMany
      .mockResolvedValueOnce([{ id: 'o1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'o2' }])
      .mockResolvedValueOnce([]);

    const app = express();
    app.use(express.json());
    app.use('/api/payment/maintenance', createMaintenanceRoutes());

    const reportRes = await request(app)
      .post('/api/payment/maintenance/cleanup/outbox/report')
      .set('x-service-key', 'svc-1')
      .send({});
    const cleanupRes = await request(app)
      .post('/api/payment/maintenance/cleanup/outbox')
      .set('x-service-key', 'svc-1')
      .send({ dryRun: true });

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.counts).toEqual({ processed: 6, failed: 2 });
    expect(cleanupRes.status).toBe(200);
    expect(cleanupRes.body.results.processed.deleted).toBe(1);
    expect(cleanupRes.body.results.failed.deleted).toBe(1);
  });

  it('rejects missing or invalid service keys', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/payment/maintenance', createMaintenanceRoutes());

    const missingKeyRes = await request(app)
      .post('/api/payment/maintenance/cleanup/outbox/report')
      .send({});
    const invalidKeyRes = await request(app)
      .post('/api/payment/maintenance/cleanup/outbox/report')
      .set('x-service-key', 'bad')
      .send({});

    expect(missingKeyRes.status).toBe(401);
    expect(invalidKeyRes.status).toBe(401);
  });
});
