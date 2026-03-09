import { csrfTokenMiddleware, csrfValidationMiddleware } from './csrf.middleware';

const makeRes = () => {
  const res: any = {};
  res.cookie = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('csrf middleware', () => {
  it('sets token cookie on initial safe requests', () => {
    const req: any = { method: 'GET', cookies: {} };
    const res = makeRes();
    const next = jest.fn();

    csrfTokenMiddleware(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'csrf-token',
      expect.any(String),
      expect.objectContaining({ sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 })
    );
    expect(next).toHaveBeenCalled();
  });

  it('skips token generation when token exists or method is unsafe', () => {
    const next = jest.fn();

    csrfTokenMiddleware({ method: 'GET', cookies: { 'csrf-token': 'abc' } } as any, makeRes(), next);
    csrfTokenMiddleware({ method: 'POST', cookies: {} } as any, makeRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('allows safe methods and rejects missing/invalid tokens', () => {
    const next = jest.fn();
    const safeReq: any = { method: 'GET', cookies: {}, headers: {} };
    csrfValidationMiddleware(safeReq, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const missingRes = makeRes();
    csrfValidationMiddleware({ method: 'POST', cookies: {}, headers: {} } as any, missingRes, jest.fn());
    expect(missingRes.status).toHaveBeenCalledWith(403);
    expect(missingRes.json).toHaveBeenCalledWith({ success: false, message: 'CSRF token missing' });

    const invalidRes = makeRes();
    csrfValidationMiddleware(
      { method: 'PUT', cookies: { 'csrf-token': 'abc' }, headers: { 'x-csrf-token': 123 } } as any,
      invalidRes,
      jest.fn()
    );
    expect(invalidRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid CSRF token format' });
  });

  it('rejects mismatches and accepts matching tokens', () => {
    const mismatchLen = makeRes();
    csrfValidationMiddleware(
      { method: 'PATCH', cookies: { 'csrf-token': 'abc' }, headers: { 'x-csrf-token': 'abcd' } } as any,
      mismatchLen,
      jest.fn()
    );
    expect(mismatchLen.json).toHaveBeenCalledWith({ success: false, message: 'Invalid CSRF token' });

    const mismatchVal = makeRes();
    csrfValidationMiddleware(
      { method: 'PATCH', cookies: { 'csrf-token': 'abcdef' }, headers: { 'x-csrf-token': 'abcdeg' } } as any,
      mismatchVal,
      jest.fn()
    );
    expect(mismatchVal.json).toHaveBeenCalledWith({ success: false, message: 'CSRF token mismatch' });

    const next = jest.fn();
    csrfValidationMiddleware(
      { method: 'DELETE', cookies: { 'csrf-token': 'same-token' }, headers: { 'x-csrf-token': 'same-token' } } as any,
      makeRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });
});
