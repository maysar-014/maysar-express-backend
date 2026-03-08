jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn()
  }
}));

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from './auth.middleware';
import {
  authMiddleware as notificationAuthMiddleware,
  optionalAuth as notificationOptionalAuth
} from '../../../../notification-service/src/api/middleware/auth.middleware';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  return response as unknown as Response;
};

describe('auth middleware contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing bearer token in support authenticate', () => {
    const req = { headers: {} } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: Missing or invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user context on valid token and proceeds', () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user-1', roles: ['admin'] });
    const req = { headers: { authorization: 'Bearer valid-token' } } as unknown as Request & {
      user?: { userId: string; roles: string[] };
    };
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 'user-1', roles: ['admin'] });
    expect(next).toHaveBeenCalled();
  });

  it('enforces role-based authorization checks in support authorize', () => {
    const allowed = authorize(['admin']);
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    const unauthenticatedReq = {} as unknown as Request;
    allowed(unauthenticatedReq, res, next);
    expect(res.status).toHaveBeenCalledWith(401);

    const forbiddenReq = { user: { roles: ['seller'] } } as unknown as Request;
    allowed(forbiddenReq, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    const allowedReq = { user: { roles: ['admin'] } } as unknown as Request;
    allowed(allowedReq, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('handles token and user-id extraction in notification auth middleware', () => {
    const req = {
      headers: {
        authorization: 'Bearer notif-token',
        'x-user-id': 'notif-user'
      }
    } as unknown as Request & { token?: string; userId?: string };
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    notificationAuthMiddleware(req, res, next);

    expect(req.userId).toBe('notif-user');
    expect(req.token).toBe('notif-token');
    expect(next).toHaveBeenCalledWith();
  });

  it('passes APIError to next when notification auth data is missing', () => {
    const req = { headers: {} } as unknown as Request;
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    notificationAuthMiddleware(req, res, next);

    const errorArg = next.mock.calls[0][0] as unknown as Error & { statusCode?: number };
    expect(errorArg.message).toBe('Authentication required');
    expect(errorArg.statusCode).toBe(401);
  });

  it('keeps notification optionalAuth non-blocking', () => {
    const req = { headers: {} } as unknown as Request & { userId?: string };
    const res = createResponse();
    const next = jest.fn() as jest.MockedFunction<NextFunction>;

    notificationOptionalAuth(req, res, next);

    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});
