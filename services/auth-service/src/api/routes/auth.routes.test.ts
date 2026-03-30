import express from 'express';
import request from 'supertest';

const mockValidateRequest = jest.fn((_schema?: unknown) => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next());
const mockAsyncHandler = jest.fn(
  (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => unknown) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)
);
const mockRateLimit = jest.fn((_options?: unknown) => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next());
const mockCsrfValidation = jest.fn((_req: express.Request, _res: express.Response, next: express.NextFunction) => next());
const mockRequireAuth = jest.fn((_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

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
jest.mock('@shared/middleware/csrf.middleware', () => ({
  csrfValidationMiddleware: (...args: unknown[]) =>
    mockCsrfValidation(...args as [express.Request, express.Response, express.NextFunction])
}));
jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: (...args: unknown[]) =>
    mockRequireAuth(...args as [express.Request, express.Response, express.NextFunction])
}));

import { createAuthRoutes } from './auth.routes';

const makeController = () => {
  const respond = (name: string) =>
    jest.fn(async (_req: express.Request, res: express.Response) => {
      res.status(200).json({ handler: name });
    });

  return {
    register: respond('register'),
    login: respond('login'),
    logout: respond('logout'),
    refreshToken: respond('refreshToken'),
    verifySession: respond('verifySession'),
    forgotPassword: respond('forgotPassword'),
    resetPassword: respond('resetPassword'),
    enableTwoFactor: respond('enableTwoFactor'),
    disableTwoFactor: respond('disableTwoFactor'),
    verifyTwoFactorSetup: respond('verifyTwoFactorSetup'),
    reportSuspiciousActivity: respond('reportSuspiciousActivity'),
    getAuthStats: respond('getAuthStats')
  };
};

describe('auth.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates expected auth route map with middleware wiring', () => {
    const controller = makeController();
    const router = createAuthRoutes(controller);

    const endpoints = router.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/register',
        '/login',
        '/logout',
        '/refresh',
        '/verify',
        '/forgot-password',
        '/reset-password',
        '/2fa/enable',
        '/2fa/disable',
        '/2fa/verify',
        '/report-suspicious',
        '/stats'
      ])
    );
  });

  it('dispatches representative auth endpoints to provided controller', async () => {
    const controller = makeController();
    const router = createAuthRoutes(controller);
    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', router);

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'user@example.com',
      password: 'password123'
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.handler).toBe('login');

    const verifyRes = await request(app).get('/api/v1/auth/verify').set('authorization', 'Bearer token');
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.handler).toBe('verifySession');

    const twoFaRes = await request(app).post('/api/v1/auth/2fa/verify').send({ secret: 'abc', totpCode: '123456' });
    expect(twoFaRes.status).toBe(200);
    expect(twoFaRes.body.handler).toBe('verifyTwoFactorSetup');

    const statsRes = await request(app).get('/api/v1/auth/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.handler).toBe('getAuthStats');
  });
});
