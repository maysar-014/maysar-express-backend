import express from 'express';
import request from 'supertest';
import { createMaintenanceRoutes } from './maintenance.routes';

const createPrismaMock = () => ({
  wallet_OutboxEvent: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  wallet_IdempotencyRecord: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  }
});

describe('wallet maintenance routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ALLOWED_SERVICE_KEYS: 'svc-1,svc-2' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns maintenance reports for outbox and idempotency cleanup', async () => {
    const prisma = createPrismaMock();
    prisma.wallet_OutboxEvent.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    prisma.wallet_IdempotencyRecord.count.mockResolvedValueOnce(7);

    const app = express();
    app.use(express.json());
    app.use('/api/wallet/maintenance', createMaintenanceRoutes(prisma as never));

    const outboxReport = await request(app)
      .post('/api/wallet/maintenance/cleanup/outbox/report')
      .set('x-service-key', 'svc-1')
      .send({});
    const idempotencyReport = await request(app)
      .post('/api/wallet/maintenance/cleanup/idempotency/report')
      .set('x-service-key', 'svc-1')
      .send({});

    expect(outboxReport.status).toBe(200);
    expect(outboxReport.body.counts).toEqual({ processed: 4, failed: 2 });
    expect(idempotencyReport.status).toBe(200);
    expect(idempotencyReport.body.count).toBe(7);
  });

  it('cleans wallet outbox and idempotency rows in dry-run mode', async () => {
    const prisma = createPrismaMock();
    prisma.wallet_OutboxEvent.findMany
      .mockResolvedValueOnce([{ id: 'o1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'o2' }])
      .mockResolvedValueOnce([]);
    prisma.wallet_IdempotencyRecord.findMany
      .mockResolvedValueOnce([{ key: 'k1' }, { key: 'k2' }])
      .mockResolvedValueOnce([]);

    const app = express();
    app.use(express.json());
    app.use('/api/wallet/maintenance', createMaintenanceRoutes(prisma as never));

    const outboxRes = await request(app)
      .post('/api/wallet/maintenance/cleanup/outbox')
      .set('x-service-key', 'svc-2')
      .send({ dryRun: true });
    const idempotencyRes = await request(app)
      .post('/api/wallet/maintenance/cleanup/idempotency')
      .set('x-service-key', 'svc-2')
      .send({ dryRun: true });

    expect(outboxRes.status).toBe(200);
    expect(outboxRes.body.results.processed.deleted).toBe(1);
    expect(outboxRes.body.results.failed.deleted).toBe(1);
    expect(idempotencyRes.status).toBe(200);
    expect(idempotencyRes.body.result.deleted).toBe(2);
  });
});
