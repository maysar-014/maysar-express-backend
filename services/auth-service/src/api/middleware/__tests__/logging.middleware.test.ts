import type { NextFunction, Request, Response } from 'express';

jest.mock('../../../infrastructure/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import { logger } from '../../../infrastructure/services/logger.service';
import { performanceLogger, requestLogger, securityLogger } from '../logging.middleware';

const buildRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    method: 'GET',
    url: '/api/v1/test',
    ip: '127.0.0.1',
    get: jest.fn((name: string) => (name === 'User-Agent' ? 'jest-agent' : undefined)),
    ...overrides
  }) as unknown as Request;

const buildResponse = (overrides: Partial<Response> = {}): Response => {
  const response = {
    statusCode: 200,
    setHeader: jest.fn(),
    get: jest.fn(),
    end: jest.fn(function end(this: Response) {
      return this;
    }),
    ...overrides
  } as unknown as Response;

  return response;
};

describe('logging middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requestLogger sets request id header and logs lifecycle', () => {
    const req = buildRequest({ headers: { 'x-request-id': 'req-123' } });
    const res = buildResponse();
    const next = jest.fn() as unknown as NextFunction;

    requestLogger(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'req-123');
    expect(logger.info).toHaveBeenCalledWith(
      'Request started',
      expect.objectContaining({
        requestId: 'req-123',
        method: 'GET',
        url: '/api/v1/test'
      })
    );
    expect(next).toHaveBeenCalled();

    res.end();
    expect(logger.info).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({
        requestId: 'req-123',
        statusCode: 200
      })
    );
  });

  it('securityLogger emits warnings when security-relevant headers are present', () => {
    const req = buildRequest({
      headers: {
        authorization: 'Bearer token',
        'x-forwarded-for': '10.0.0.1'
      }
    });
    const res = buildResponse();
    const next = jest.fn() as unknown as NextFunction;

    securityLogger(req, res, next);
    res.end();

    expect(logger.warn).toHaveBeenCalledWith(
      'Security events detected',
      expect.objectContaining({
        events: expect.arrayContaining(['AUTH_TOKEN_PRESENT', 'PROXY_REQUEST'])
      })
    );
    expect(next).toHaveBeenCalled();
  });

  it('performanceLogger logs slow requests and development diagnostics', () => {
    const req = buildRequest({ headers: { 'x-request-id': 'req-perf' } });
    const res = buildResponse();
    const next = jest.fn() as unknown as NextFunction;
    const hrtimeSpy = jest
      .spyOn(process.hrtime, 'bigint')
      .mockReturnValueOnce(0n)
      .mockReturnValueOnce(1_500_000_000n);
    const memorySpy = jest
      .spyOn(process, 'memoryUsage')
      .mockReturnValueOnce({
        rss: 1000,
        heapTotal: 1000,
        heapUsed: 1000,
        external: 1000,
        arrayBuffers: 1000
      })
      .mockReturnValueOnce({
        rss: 1100,
        heapTotal: 1200,
        heapUsed: 1100,
        external: 1005,
        arrayBuffers: 1000
      });
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    performanceLogger(req, res, next);
    res.end();

    expect(logger.warn).toHaveBeenCalledWith(
      'Slow request detected',
      expect.objectContaining({
        requestId: 'req-perf',
        executionTime: expect.any(Number)
      })
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Request performance metrics',
      expect.objectContaining({
        requestId: 'req-perf',
        duration: expect.stringContaining('ms')
      })
    );
    expect(next).toHaveBeenCalled();

    process.env.NODE_ENV = previousEnv;
    hrtimeSpy.mockRestore();
    memorySpy.mockRestore();
  });
});
