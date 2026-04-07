import express from 'express';
import request from 'supertest';

const mockLoggerInfo = jest.fn();

const controllerHandlers = {
  initiateOAuth: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ handler: 'initiateOAuth' })),
  handleCallback: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ handler: 'handleCallback' })),
  refreshToken: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ handler: 'refreshToken' })),
  revokeAccess: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ handler: 'revokeAccess' }))
};

jest.mock('../controllers/google-oauth.controller', () => ({
  GoogleOAuthController: jest.fn().mockImplementation(() => controllerHandlers)
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { GoogleOAuthRoutes, createGoogleOAuthRoutes } from './google-oauth.routes';

describe('google-oauth.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes oauth route class and logs startup', () => {
    const routes = new GoogleOAuthRoutes();
    const router = routes.getRouter();
    const endpoints = router.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining(['/initiate', '/callback', '/refresh', '/revoke'])
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith('Google OAuth routes initialized');
  });

  it('dispatches oauth endpoints to controller methods', async () => {
    const app = express();
    app.use(express.json());
    app.use('/oauth', createGoogleOAuthRoutes());

    const initRes = await request(app).get('/oauth/initiate');
    expect(initRes.status).toBe(200);
    expect(initRes.body.handler).toBe('initiateOAuth');

    const callbackRes = await request(app).get('/oauth/callback');
    expect(callbackRes.status).toBe(200);
    expect(callbackRes.body.handler).toBe('handleCallback');

    const refreshRes = await request(app).post('/oauth/refresh').send({ refreshToken: 'refresh-token' });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.handler).toBe('refreshToken');

    const revokeRes = await request(app).post('/oauth/revoke').send({ token: 'access-token' });
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.handler).toBe('revokeAccess');
  });
});
