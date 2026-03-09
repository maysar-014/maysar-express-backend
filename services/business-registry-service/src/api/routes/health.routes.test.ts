import express from 'express';
import request from 'supertest';

const mockGetDLQ = jest.fn();
const mockGetSubscriberCount = jest.fn();
const mockQueryRaw = jest.fn();

jest.mock('@shared/events/eventBus', () => ({
  eventBus: {
    getDLQ: (...args: unknown[]) => mockGetDLQ(...args),
    getSubscriberCount: (...args: unknown[]) => mockGetSubscriberCount(...args)
  }
}));

jest.mock('../../infrastructure/database/prisma-client', () => ({
  getPrismaClient: jest.fn(() => ({
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args)
  }))
}));

import { createHealthRoutes } from './health.routes';

describe('health.routes (business-registry-service)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSubscriberCount.mockReturnValue(2);
    mockGetDLQ.mockReturnValue(
      new Map<string, unknown[]>([
        ['BusinessRegistered', [{ id: 'a' }]],
        ['BusinessVerified', []],
        ['BusinessUpdated', [{ id: 'b' }, { id: 'c' }]]
      ])
    );
    mockQueryRaw.mockResolvedValue([{ result: 1 }]);
  });

  it('returns event bus health snapshot', async () => {
    const app = express();
    app.use('/health', createHealthRoutes());

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'business-registry-service',
        eventBus: expect.objectContaining({
          subscribers: expect.objectContaining({
            BusinessRegistered: 2
          }),
          dlqSizes: expect.objectContaining({
            BusinessRegistered: 1,
            BusinessUpdated: 2
          })
        })
      })
    );
  });

  it('reports readiness when database query succeeds', async () => {
    const app = express();
    app.use('/health', createHealthRoutes());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ready',
        database: 'connected'
      })
    );
  });

  it('reports not-ready state when database query fails', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('db down'));
    const app = express();
    app.use('/health', createHealthRoutes());

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'not ready',
        database: 'disconnected',
        error: 'db down'
      })
    );
  });

  it('returns liveness status', async () => {
    const app = express();
    app.use('/health', createHealthRoutes());

    const res = await request(app).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });
});
