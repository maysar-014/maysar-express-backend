import express from 'express';
import request from 'supertest';

const mockAsyncHandler = jest.fn(
  (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => unknown) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)
);

const handler = (name: string) =>
  jest.fn(async (_req: express.Request, res: express.Response) => {
    res.status(200).json({ handler: name });
  });

const mockHealthController = {
  basicHealth: handler('basicHealth'),
  detailedHealth: handler('detailedHealth'),
  readiness: handler('readiness'),
  liveness: handler('liveness'),
  serviceDiscovery: handler('serviceDiscovery'),
  circuitBreakerStatus: handler('circuitBreakerStatus'),
  metrics: handler('metrics')
};

jest.mock('../middleware/error-handler.middleware', () => ({
  asyncHandler: (...args: unknown[]) =>
    mockAsyncHandler(...args as [(req: express.Request, res: express.Response, next: express.NextFunction) => unknown])
}));

jest.mock('../controllers/health.controller', () => ({
  healthController: mockHealthController
}));

import { healthRoutes } from './health.routes';

const app = express();
app.use('/health', healthRoutes);

describe('health.routes (auth-service)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers complete health probe endpoints', () => {
    const endpoints = healthRoutes.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/',
        '/detailed',
        '/ready',
        '/live',
        '/discovery',
        '/circuit-breaker',
        '/metrics'
      ])
    );
  });

  it('forwards each probe endpoint to the mapped controller method', async () => {
    const root = await request(app).get('/health');
    expect(root.status).toBe(200);
    expect(root.body.handler).toBe('basicHealth');

    const detailed = await request(app).get('/health/detailed');
    expect(detailed.status).toBe(200);
    expect(detailed.body.handler).toBe('detailedHealth');

    const ready = await request(app).get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.handler).toBe('readiness');

    const metrics = await request(app).get('/health/metrics');
    expect(metrics.status).toBe(200);
    expect(metrics.body.handler).toBe('metrics');
  });
});
