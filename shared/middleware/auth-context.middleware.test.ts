const verifyMock = jest.fn();

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: verifyMock
  }
}));

import { attachAuthContext, requireAuth, requireRole, requireRoleOrService } from './auth-context.middleware';

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('auth-context middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-value-that-is-long-enough';
    process.env.ALLOWED_SERVICE_KEYS = 'internal-a,internal-b';
    process.env.ALLOW_GATEWAY_AUTH = 'false';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('attaches auth context from a valid bearer token', () => {
    verifyMock.mockReturnValueOnce({
      userId: 'usr_1',
      email: 'user@example.com',
      roles: ['buyer']
    });
    const req: any = { headers: { authorization: 'Bearer token-123' } };
    const res: any = createResponse();
    const next = jest.fn();

    attachAuthContext(req, res, next);

    expect(req.user).toEqual({
      userId: 'usr_1',
      email: 'user@example.com',
      roles: ['buyer'],
      token: 'token-123'
    });
    expect(next).toHaveBeenCalled();
  });

  it('requires auth and supports service roles when configured', () => {
    const req: any = {
      headers: {
        'x-service-key': 'internal-a'
      }
    };
    const res: any = createResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.service).toEqual({
      serviceKey: 'internal-a',
      serviceId: 'service'
    });
  });

  it('forbids a user missing required roles but allows service passthrough when requested', () => {
    verifyMock.mockReturnValueOnce({
      userId: 'usr_2',
      roles: ['buyer']
    });
    const req: any = {
      headers: { authorization: 'Bearer token-456' }
    };
    const forbiddenRes: any = createResponse();
    const next = jest.fn();

    requireRole('admin')(req, forbiddenRes, next);

    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    expect(forbiddenRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' })
      })
    );

    const serviceReq: any = {
      headers: {
        'x-service-key': 'internal-b'
      }
    };
    const serviceRes: any = createResponse();
    requireRoleOrService('admin')(serviceReq, serviceRes, next);

    expect(next).toHaveBeenCalled();
    expect(serviceReq.service).toEqual({
      serviceKey: 'internal-b',
      serviceId: 'service'
    });
  });
});
