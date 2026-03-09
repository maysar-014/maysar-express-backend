import express from 'express';
import request from 'supertest';

const mockValidateRequest = jest.fn((_schema?: unknown) => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next());
const mockAsyncHandler = jest.fn(
  (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => unknown) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next)
);

const mockAdminController = {
  getUser: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getUser' })),
  updateUserStatus: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'updateUserStatus' })),
  updateUserRole: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'updateUserRole' })),
  searchUsers: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'searchUsers' })),
  getUserSessions: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getUserSessions' })),
  terminateUserSessions: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'terminateUserSessions' })),
  terminateSession: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'terminateSession' })),
  getAuditLogs: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getAuditLogs' })),
  getSecurityEvents: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getSecurityEvents' })),
  getSystemStats: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getSystemStats' })),
  refreshServiceDiscovery: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'refreshServiceDiscovery' })),
  getServiceHealth: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getServiceHealth' }))
};

jest.mock('../middleware/validation.middleware', () => ({
  validateRequest: (schema: unknown) => mockValidateRequest(schema)
}));

jest.mock('../middleware/error-handler.middleware', () => ({
  asyncHandler: (...args: unknown[]) => mockAsyncHandler(...args as [(req: express.Request, res: express.Response, next: express.NextFunction) => unknown])
}));

jest.mock('../controllers/admin.controller', () => ({
  adminController: mockAdminController
}));

import { adminRoutes } from './admin.routes';

const app = express();
app.use(express.json());
app.use('/api/v1/admin', adminRoutes);

describe('admin.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers full admin endpoint surface', () => {
    const endpoints = adminRoutes.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/users/:userId',
        '/users/:userId/status',
        '/users/:userId/role',
        '/users/search',
        '/users/:userId/sessions',
        '/sessions/:sessionId',
        '/audit',
        '/security-events',
        '/stats',
        '/discovery/refresh',
        '/health'
      ])
    );
  });

  it('delegates representative endpoints to admin controller handlers', async () => {
    const userRes = await request(app).get('/api/v1/admin/users/user-1');
    expect(userRes.status).toBe(200);
    expect(userRes.body.action).toBe('getUser');

    const statusRes = await request(app).patch('/api/v1/admin/users/user-1/status').send({ status: 'suspended' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.action).toBe('updateUserStatus');

    const statsRes = await request(app).get('/api/v1/admin/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.action).toBe('getSystemStats');
  });
});
