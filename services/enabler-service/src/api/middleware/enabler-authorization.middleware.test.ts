const findByUserIdMock = jest.fn();

jest.mock('../../infrastructure/repositories/prisma-enabler.repository', () => ({
  PrismaEnablerRepository: jest.fn().mockImplementation(() => ({
    findByUserId: (...args: unknown[]) => findByUserIdMock(...args)
  }))
}));

import { authorizeEnabler } from './enabler-authorization.middleware';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authorizeEnabler middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when x-user-id header is missing', async () => {
    const req: any = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    await authorizeEnabler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not an enabler', async () => {
    findByUserIdMock.mockResolvedValue(null);
    const req: any = { headers: { 'x-user-id': 'user-1' } };
    const res = makeRes();
    const next = jest.fn();

    await authorizeEnabler(req, res, next);

    expect(findByUserIdMock).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'User is not an enabler' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for inactive enabler and allows active/approved enabler', async () => {
    findByUserIdMock
      .mockResolvedValueOnce({ id: 'en-1', tier: 'SILVER', status: 'SUSPENDED' })
      .mockResolvedValueOnce({ id: 'en-2', tier: 'GOLD', status: 'ACTIVE' });

    const deniedReq: any = { headers: { 'x-user-id': 'user-2' } };
    const deniedRes = makeRes();
    const deniedNext = jest.fn();
    await authorizeEnabler(deniedReq, deniedRes, deniedNext);
    expect(deniedRes.status).toHaveBeenCalledWith(403);
    expect(deniedRes.json).toHaveBeenCalledWith({ error: 'Enabler account is not active' });

    const allowedReq: any = { headers: { 'x-user-id': 'user-3' } };
    const allowedRes = makeRes();
    const allowedNext = jest.fn();
    await authorizeEnabler(allowedReq, allowedRes, allowedNext);

    expect((allowedReq as any).enablerContext).toEqual({ enablerId: 'en-2', tier: 'GOLD' });
    expect(allowedNext).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when repository throws', async () => {
    findByUserIdMock.mockRejectedValue(new Error('db-failure'));
    const req: any = { headers: { 'x-user-id': 'user-4' } };
    const res = makeRes();
    const next = jest.fn();

    await authorizeEnabler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization failed' });
    expect(next).not.toHaveBeenCalled();
  });
});

