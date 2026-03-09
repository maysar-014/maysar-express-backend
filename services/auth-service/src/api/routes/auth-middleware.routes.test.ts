import express from 'express';
import request from 'supertest';

const mockValidateRequest = jest.fn((_schema?: unknown) => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next());
const mockAsyncHandler = jest.fn(
  (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => unknown) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)
);
const mockRateLimit = jest.fn((_options?: unknown) => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

const buildHandler = (name: string) =>
  jest.fn(async (_req: express.Request, res: express.Response) => {
    res.status(200).json({ handler: name });
  });

const controllerMethods = {
  validateToken: buildHandler('validateToken'),
  checkTokenBlacklist: buildHandler('checkTokenBlacklist'),
  blacklistToken: buildHandler('blacklistToken'),
  validateApiKey: buildHandler('validateApiKey'),
  generateApiKey: buildHandler('generateApiKey'),
  revokeApiKey: buildHandler('revokeApiKey'),
  checkBruteForce: buildHandler('checkBruteForce'),
  recordFailure: buildHandler('recordFailure'),
  resetBruteForce: buildHandler('resetBruteForce'),
  trackDevice: buildHandler('trackDevice'),
  getDeviceHistory: buildHandler('getDeviceHistory'),
  removeDevice: buildHandler('removeDevice'),
  extendSession: buildHandler('extendSession'),
  getSessionInfo: buildHandler('getSessionInfo'),
  invalidateSession: buildHandler('invalidateSession'),
  healthCheck: buildHandler('healthCheck'),
  getMetrics: buildHandler('getMetrics')
};

jest.mock('../middleware/validation.middleware', () => ({
  validateRequest: (schema: unknown) => mockValidateRequest(schema)
}));
jest.mock('../middleware/error-handler.middleware', () => ({
  asyncHandler: (...args: unknown[]) =>
    mockAsyncHandler(...args as [(req: express.Request, res: express.Response, next: express.NextFunction) => unknown])
}));
jest.mock('../middleware/rate-limiting.middleware', () => ({
  rateLimit: (options: unknown) => mockRateLimit(options)
}));
jest.mock('../controllers/auth-middleware.controller', () => ({
  AuthMiddlewareController: jest.fn().mockImplementation(() => controllerMethods)
}));

import { authMiddlewareRoutes } from './auth-middleware.routes';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authMiddlewareRoutes);

describe('auth-middleware.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers all middleware-auth endpoint groups', () => {
    const endpoints = authMiddlewareRoutes.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/validate-token',
        '/check-blacklist',
        '/blacklist-token',
        '/validate-api-key',
        '/generate-api-key',
        '/revoke-api-key',
        '/check-brute-force',
        '/record-failure',
        '/reset-brute-force',
        '/track-device',
        '/device-history/:userId',
        '/device/:deviceId',
        '/extend-session',
        '/session/:sessionId',
        '/invalidate-session',
        '/middleware/health',
        '/metrics'
      ])
    );
  });

  it('forwards calls to controller handlers across representative route groups', async () => {
    const tokenRes = await request(app).post('/api/v1/auth/validate-token').send({ token: 'jwt-token' });
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.handler).toBe('validateToken');

    const deviceRes = await request(app).get('/api/v1/auth/device-history/u1');
    expect(deviceRes.status).toBe(200);
    expect(deviceRes.body.handler).toBe('getDeviceHistory');

    const sessionRes = await request(app).post('/api/v1/auth/invalidate-session').send({ sessionId: 's1', userId: 'u1' });
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.handler).toBe('invalidateSession');

    const metricsRes = await request(app).get('/api/v1/auth/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.handler).toBe('getMetrics');
  });
});
