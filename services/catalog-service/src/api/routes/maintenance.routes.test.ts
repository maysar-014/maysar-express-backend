import express from 'express';
import request from 'supertest';
import { createMaintenanceRoutes } from './maintenance.routes';

const createPrismaMock = () => ({
  catalogOutboxEvent: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  campaign_OutboxEvent: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  eventStore: {
    count: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  }
});

describe('catalog maintenance routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ALLOWED_SERVICE_KEYS: 'svc-1,svc-2' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns maintenance reports for outbox and event-store cleanup', async () => {
    const prisma = createPrismaMock();
    prisma.catalogOutboxEvent.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    prisma.campaign_OutboxEvent.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    prisma.eventStore.count.mockResolvedValueOnce(8);

    const app = express();
    app.use(express.json());
    app.use('/api/catalog/maintenance', createMaintenanceRoutes(prisma as never));

    const outboxReport = await request(app)
      .post('/api/catalog/maintenance/cleanup/outbox/report')
      .set('x-service-key', 'svc-1')
      .send({});
    const eventStoreReport = await request(app)
      .post('/api/catalog/maintenance/cleanup/event-store/report')
      .set('x-service-key', 'svc-1')
      .send({});

    expect(outboxReport.status).toBe(200);
    expect(outboxReport.body.counts).toEqual({
      catalog: { processed: 5, failed: 1 },
      campaigns: { processed: 3, failed: 2 }
    });
    expect(eventStoreReport.status).toBe(200);
    expect(eventStoreReport.body.count).toBe(8);
  });

  it('cleans outbox and event-store rows in dry-run mode', async () => {
    const prisma = createPrismaMock();
    prisma.catalogOutboxEvent.findMany
      .mockResolvedValueOnce([{ id: 'c1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c2' }])
      .mockResolvedValueOnce([]);
    prisma.campaign_OutboxEvent.findMany
      .mockResolvedValueOnce([{ id: 'p1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'p2' }])
      .mockResolvedValueOnce([]);
    prisma.eventStore.findMany
      .mockResolvedValueOnce([{ id: 'e1' }, { id: 'e2' }])
      .mockResolvedValueOnce([]);

    const app = express();
    app.use(express.json());
    app.use('/api/catalog/maintenance', createMaintenanceRoutes(prisma as never));

    const outboxRes = await request(app)
      .post('/api/catalog/maintenance/cleanup/outbox')
      .set('x-service-key', 'svc-2')
      .send({ dryRun: true });
    const eventStoreRes = await request(app)
      .post('/api/catalog/maintenance/cleanup/event-store')
      .set('x-service-key', 'svc-2')
      .send({ dryRun: true });

    expect(outboxRes.status).toBe(200);
    expect(outboxRes.body.results.catalog.processed.deleted).toBe(1);
    expect(outboxRes.body.results.catalog.failed.deleted).toBe(1);
    expect(outboxRes.body.results.campaigns.processed.deleted).toBe(1);
    expect(outboxRes.body.results.campaigns.failed.deleted).toBe(1);
    expect(eventStoreRes.status).toBe(200);
    expect(eventStoreRes.body.result.deleted).toBe(2);
  });
});
