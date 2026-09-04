import express from 'express';
import request from 'supertest';

const mockAdminController = {
  terminateSession: jest.fn(async (_req: express.Request, res: express.Response) => {
    res.status(200).json({ action: 'terminateSession' });
  }),
};

jest.mock('../controllers/admin.controller', () => ({
  adminController: {
    getUser: jest.fn(),
    updateUserStatus: jest.fn(),
    updateUserRole: jest.fn(),
    searchUsers: jest.fn(),
    getUserSessions: jest.fn(),
    terminateUserSessions: jest.fn(),
    terminateSession: (...args: unknown[]) => mockAdminController.terminateSession(...args as [express.Request, express.Response]),
    getAuditLogs: jest.fn(),
    getSecurityEvents: jest.fn(),
    getSystemStats: jest.fn(),
    refreshServiceDiscovery: jest.fn(),
    getServiceHealth: jest.fn(),
    verifyPhone: jest.fn()
  }
}));

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireRole: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next()
}));

import { adminRoutes } from './admin.routes';

describe('admin.routes validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-visible session termination reasons', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/admin', adminRoutes);

    const response = await request(app)
      .delete('/api/v1/admin/sessions/obj_01ARZ3NDEKTSV4RRFFQ69G5FAV')
      .send({ reason: '\u0085' });

    expect(response.status).toBe(400);
    expect(mockAdminController.terminateSession).not.toHaveBeenCalled();
  });
});
