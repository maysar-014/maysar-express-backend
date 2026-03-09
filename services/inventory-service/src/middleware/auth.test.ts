jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn()
  }
}));

import jwt from 'jsonwebtoken';
import { requireAuth } from './auth';

const verifyMock = (jwt as unknown as { verify: jest.Mock }).verify;

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when token is missing', () => {
    const req: any = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts bearer token and attaches decoded user payload', () => {
    verifyMock.mockReturnValue({ userId: 'u1', role: 'admin' });
    const req: any = { headers: { authorization: 'Bearer token-1' } };
    const res = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(verifyMock).toHaveBeenCalledWith('token-1', expect.any(String));
    expect(req.user).toEqual({ userId: 'u1', role: 'admin' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('accepts x-api-key token and returns 401 on invalid token', () => {
    verifyMock.mockImplementation(() => {
      throw new Error('bad token');
    });
    const req: any = { headers: { 'x-api-key': 'api-token' } };
    const res = makeRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(verifyMock).toHaveBeenCalledWith('api-token', expect.any(String));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});

