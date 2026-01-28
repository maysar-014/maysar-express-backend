import {
  validateRequest,
  validateQuery,
  validateParams,
  validationErrorHandler,
  sanitizeRequest,
  validateFileUpload,
  validateAuth,
  requireRole,
  validateOwnership,
  validateRateLimit,
  sanitizeSqlInput
} from '../validation.middleware';

describe('validation.middleware', () => {
  const makeReq = (overrides: any = {}) => ({
    body: {},
    query: {},
    params: {},
    path: '/x',
    method: 'POST',
    ip: '1.2.3.4',
    get: jest.fn().mockReturnValue('UA'),
    ...overrides
  }) as any;

  const res = {} as any;

  test('validateRequest success replaces body and calls next', () => {
    const schema = { validate: jest.fn().mockReturnValue({ error: null, value: { a: 1 } }) };
    const req = makeReq({ body: { a: ' 1 ' } });
    const next = jest.fn();
    validateRequest(schema)(req, res, next);
    expect(req.body).toEqual({ a: 1 });
    expect(next).toHaveBeenCalledWith();
  });

  test('validateRequest error calls next with validation error', () => {
    const err = { details: [{ path: ['a'], message: 'bad', context: { value: 'x' } }] };
    const schema = { validate: jest.fn().mockReturnValue({ error: err, value: {} }) };
    const req = makeReq({ body: {} });
    const next = jest.fn();
    validateRequest(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    const calledArg = next.mock.calls[0][0];
    expect(calledArg).toBeDefined();
    expect(calledArg.message).toBe('Validation failed');
  });

  test('validateQuery success replaces query', () => {
    const schema = { validate: jest.fn().mockReturnValue({ error: null, value: { q: 'x' } }) };
    const req = makeReq({ query: { q: ' x ' } });
    const next = jest.fn();
    validateQuery(schema)(req, res, next);
    expect(req.query).toEqual({ q: 'x' });
    expect(next).toHaveBeenCalledWith();
  });

  test('validateQuery error calls next with badRequest', () => {
    const schema = { validate: jest.fn().mockReturnValue({ error: { details: [{ path: ['q'], message: 'no' }] }, value: {} }) };
    const req = makeReq({ query: {} });
    const next = jest.fn();
    validateQuery(schema)(req, res, next);
    const calledArg = next.mock.calls[0][0];
    expect(calledArg).toBeDefined();
    expect(calledArg.message).toBe('Invalid query parameters');
  });

  test('validateParams error calls next with badRequest', () => {
    const schema = { validate: jest.fn().mockReturnValue({ error: { details: [{ path: ['id'], message: 'bad' }] }, value: {} }) };
    const req = makeReq({ params: { id: 'x' } });
    const next = jest.fn();
    validateParams(schema)(req, res, next);
    const calledArg = next.mock.calls[0][0];
    expect(calledArg).toBeDefined();
    expect(calledArg.message).toBe('Invalid route parameters');
  });

  test('validationErrorHandler handles Joi errors and calls res.status/json and next', () => {
    const error: any = { isJoi: true, details: [{ path: ['a'], message: 'm' }] };
    const req = makeReq();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();
    validationErrorHandler(error, req as any, { status } as any, next as any);
    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });

  test('sanitizeRequest trims and removes scripts recursively', () => {
    const req = makeReq({ body: { name: '  foo  ', nested: { html: '<script>alert(1)</script>ok ' } }, query: { q: '  v  ' } });
    const next = jest.fn();
    sanitizeRequest(req as any, res, next);
    expect(req.body.name).toBe('foo');
    expect(req.body.nested.html).toBe('ok');
    expect(req.query.q).toBe('v');
    expect(next).toHaveBeenCalled();
  });

  test('sanitizeSqlInput detects dangerous patterns in body and calls next with badRequest', () => {
    const req = makeReq({ body: { q: 'SELECT * FROM users' }, query: {} });
    const next = jest.fn();
    sanitizeSqlInput(req as any, res, next as any);
    const arg = next.mock.calls[0][0];
    expect(arg).toBeDefined();
    expect(arg.message).toBe('Invalid input detected');
  });

  test('requireRole handles no user, insufficient and allowed roles', () => {
    const next = jest.fn();
    const resReq = makeReq();
    // no user
    requireRole('admin')(resReq as any, res, next);
    let arg = next.mock.calls.pop()?.[0];
    expect(arg).toBeDefined();
    expect(arg.message).toBe('Authentication required');

    // insufficient role
    const req2 = makeReq({ user: { id: 'u1', role: 'user' } });
    requireRole('admin')(req2 as any, res, next);
    arg = next.mock.calls.pop()?.[0];
    expect(arg).toBeDefined();
    expect(arg.message).toBe('Insufficient permissions');

    // allowed role
    const req3 = makeReq({ user: { id: 'u1', role: 'admin' } });
    const next3 = jest.fn();
    requireRole('admin')(req3 as any, res, next3);
    expect(next3).toHaveBeenCalledWith();
  });

  test('validateOwnership handles no user, mismatch and owns', () => {
    const next = jest.fn();
    const req = makeReq({ params: { id: 'r1' } });
    validateOwnership('id')(req as any, res, next);
    let arg = next.mock.calls.pop()?.[0];
    expect(arg).toBeDefined();
    expect(arg.message).toBe('Authentication required');

    // mismatch
    const req2 = makeReq({ user: { id: 'u1', role: 'USER' }, params: { id: 'r2' } });
    validateOwnership('id')(req2 as any, res, next);
    arg = next.mock.calls.pop()?.[0];
    expect(arg).toBeDefined();
    expect(arg.message).toBe('Access denied');

    // owns (id match)
    const req3 = makeReq({ user: { id: 'u1', role: 'USER' }, params: { id: 'u1' } });
    const next3 = jest.fn();
    validateOwnership('id')(req3 as any, res, next3);
    expect(next3).toHaveBeenCalledWith();

    // system role
    const req4 = makeReq({ user: { id: 's1', role: 'SYSTEM' }, params: { id: 'x' } });
    const next4 = jest.fn();
    validateOwnership('id')(req4 as any, res, next4);
    expect(next4).toHaveBeenCalledWith();
  });

  test('placeholders call next', () => {
    const next = jest.fn();
    validateFileUpload()(makeReq() as any, res, next);
    validateAuth()(makeReq() as any, res, next);
    validateRateLimit()(makeReq() as any, res, next);
    expect(next).toHaveBeenCalled();
  });
});

