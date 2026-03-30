import type { Request, Response } from 'express';

import { createSessionRouter } from './session.routes';

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res as unknown as Response;
};

const getRouteHandler = (router: any, method: 'post' | 'delete' | 'get', path: string) => {
  const layer = router.stack.find(
    (entry: any) => entry.route?.path === path && entry.route.methods[method]
  );
  return layer.route.stack[0].handle;
};

describe('createSessionRouter', () => {
  const sessionEngine = {
    createSession: jest.fn(),
    terminateSession: jest.fn(),
    getUserSessions: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST / creates a new session and returns 201', async () => {
    sessionEngine.createSession.mockResolvedValue('session-1');
    const router = createSessionRouter(sessionEngine as any);
    const handler = getRouteHandler(router as any, 'post', '/');
    const req = {
      body: { userId: 'user-1', role: 'buyer', deviceInfo: 'Chrome', ipAddress: '1.2.3.4' }
    } as unknown as Request;
    const res = createResponse();

    await handler(req, res);

    expect(sessionEngine.createSession).toHaveBeenCalledWith('user-1', 'buyer', 'Chrome', '1.2.3.4');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Session created',
      data: { sessionId: 'session-1' }
    });
  });

  it('POST / returns 500 on createSession errors', async () => {
    sessionEngine.createSession.mockRejectedValue(new Error('db down'));
    const router = createSessionRouter(sessionEngine as any);
    const handler = getRouteHandler(router as any, 'post', '/');
    const req = { body: { userId: 'user-2' } } as unknown as Request;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to create session',
      error: 'db down'
    });
  });

  it('DELETE /:sessionId terminates a session and returns 204', async () => {
    sessionEngine.terminateSession.mockResolvedValue(undefined);
    const router = createSessionRouter(sessionEngine as any);
    const handler = getRouteHandler(router as any, 'delete', '/:sessionId');
    const req = { params: { sessionId: 'session-3' } } as unknown as Request;
    const res = createResponse();

    await handler(req, res);

    expect(sessionEngine.terminateSession).toHaveBeenCalledWith('session-3');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('DELETE /:sessionId returns 500 on terminate failures', async () => {
    sessionEngine.terminateSession.mockRejectedValue(new Error('terminate failed'));
    const router = createSessionRouter(sessionEngine as any);
    const handler = getRouteHandler(router as any, 'delete', '/:sessionId');
    const req = { params: { sessionId: 'session-4' } } as unknown as Request;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to invalidate session',
      message: 'terminate failed'
    });
  });

  it('GET / validates userId and returns session list', async () => {
    sessionEngine.getUserSessions.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    const router = createSessionRouter(sessionEngine as any);
    const handler = getRouteHandler(router as any, 'get', '/');
    const req = { query: { userId: 'user-10' } } as unknown as Request;
    const res = createResponse();

    await handler(req, res);

    expect(sessionEngine.getUserSessions).toHaveBeenCalledWith('user-10');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 's1' }, { id: 's2' }]
    });
  });

  it('GET / returns 400 when userId is missing and 500 on downstream errors', async () => {
    const router = createSessionRouter(sessionEngine as any);
    const handler = getRouteHandler(router as any, 'get', '/');
    const res = createResponse();

    await handler({ query: {} } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'userId is required' });

    sessionEngine.getUserSessions.mockRejectedValueOnce(new Error('query failed'));
    const errorRes = createResponse();
    await handler({ query: { userId: 'user-err' } } as unknown as Request, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(500);
    expect(errorRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Failed to fetch sessions',
      error: 'query failed'
    });
  });
});
