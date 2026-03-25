import express from 'express';
import request from 'supertest';
import { createSwitchRoleRouter } from './switch-role.routes';

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = {
      userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      roles: ['buyer', 'seller', 'enabler']
    };
    next();
  }
}));

describe('switch-role routes', () => {
  it('creates a role-scoped session for an assigned role', async () => {
    const sessionEngine = {
      createSession: jest.fn().mockResolvedValue('ses_01ARZ3NDEKTSV4RRFFQ69G5FAV')
    };

    const app = express();
    app.use(express.json());
    app.use(createSwitchRoleRouter(sessionEngine as any));

    const response = await request(app)
      .post('/switch-role')
      .send({ role: 'seller', deviceInfo: 'Chrome on Windows' });

    expect(response.status).toBe(200);
    expect(sessionEngine.createSession).toHaveBeenCalledWith(
      'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      'seller',
      'Chrome on Windows',
      expect.any(String)
    );
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        sessionId: 'ses_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        selectedRole: 'seller'
      })
    }));
  });

  it('rejects switching into a role the user does not own', async () => {
    const sessionEngine = {
      createSession: jest.fn()
    };

    const app = express();
    app.use(express.json());
    app.use(createSwitchRoleRouter(sessionEngine as any));

    const response = await request(app)
      .post('/switch-role')
      .send({ role: 'system' });

    expect(response.status).toBe(403);
    expect(sessionEngine.createSession).not.toHaveBeenCalled();
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: 'ROLE_NOT_ASSIGNED'
      })
    }));
  });
});
