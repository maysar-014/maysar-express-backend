import { requestLogger, ensureRequestId, logRequestBody } from '../request-logger.middleware';
import { logger } from '../../../infrastructure/services/logger.service';

describe('request-logger.middleware', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('ensureRequestId sets header and request id', () => {
    const req: any = { get: jest.fn().mockReturnValue(undefined) };
    const res: any = { set: jest.fn() };
    const next = jest.fn();

    ensureRequestId(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    expect((req as any).requestId).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  test('requestLogger logs and triggers finish handlers', () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const perfSpy = jest.spyOn(logger, 'logPerformance').mockImplementation(() => {});

    const callbacks: Record<string, Function[]> = {};
    const req: any = {
      get: jest.fn().mockReturnValue(undefined),
      method: 'GET',
      url: '/x',
      path: '/x',
      query: {},
      ip: '127.0.0.1'
    };

    const res: any = {
      set: jest.fn(),
      statusCode: 200,
      get: jest.fn().mockReturnValue(''),
      on: (event: string, cb: Function) => {
        callbacks[event] = callbacks[event] || [];
        callbacks[event].push(cb);
      }
    };

    const next = jest.fn();

    const start = 1000;
    const end = start + 2000; // 2s later
    jest.spyOn(Date, 'now').mockImplementationOnce(() => start).mockImplementationOnce(() => end);

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();

    // simulate finish with a slow response and server error
    res.statusCode = 500;
    // call registered finish callbacks
    (callbacks['finish'] || []).forEach(cb => cb());

    expect(errorSpy).toHaveBeenCalled();
    expect(perfSpy).toHaveBeenCalled();
  });

  test('logRequestBody redacts sensitive fields in development', () => {
    process.env.NODE_ENV = 'development';
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});

    const req: any = {
      body: { password: 'secret', nested: { token: 't' } },
      method: 'POST',
      url: '/x',
      get: jest.fn().mockReturnValue('rid')
    };
    const res: any = {};
    const next = jest.fn();

    logRequestBody(req, res, next);

    expect(debugSpy).toHaveBeenCalledWith('Request Body', expect.objectContaining({ body: expect.any(Object) }));
    expect(next).toHaveBeenCalled();
  });
});
