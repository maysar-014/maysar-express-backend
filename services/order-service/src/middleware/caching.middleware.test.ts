export {};

import { EventEmitter } from 'events';
import type { Request, Response, NextFunction } from 'express';

const cacheGetMock = jest.fn();
const cacheSetMock = jest.fn();
const cacheInvalidateByTagsMock = jest.fn();
const cacheGetStatsMock = jest.fn();
const loggerDebugMock = jest.fn();
const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerErrorMock = jest.fn();

jest.mock('../infrastructure/cache/cache-manager', () => ({
  cacheManager: {
    get: (...args: any[]) => cacheGetMock(...args),
    set: (...args: any[]) => cacheSetMock(...args),
    invalidateByTags: (...args: any[]) => cacheInvalidateByTagsMock(...args),
    getStats: (...args: any[]) => cacheGetStatsMock(...args)
  },
  cacheAside: jest.fn()
}));

jest.mock('../infrastructure/monitoring/logger', () => ({
  appLogger: {
    debug: (...args: any[]) => loggerDebugMock(...args),
    info: (...args: any[]) => loggerInfoMock(...args),
    warn: (...args: any[]) => loggerWarnMock(...args),
    error: (...args: any[]) => loggerErrorMock(...args)
  }
}));

jest.mock('../infrastructure/monitoring/metrics', () => ({
  metricsCollector: {}
}));

import {
  cacheBypass,
  cacheInvalidation,
  cacheResponse,
  cacheStats,
  CacheWarmer
} from './caching.middleware';

const createReq = (overrides: Partial<Request> = {}): Request =>
  ({
    method: 'GET',
    path: '/orders',
    query: {},
    headers: {},
    get: jest.fn((name: string) => {
      const key = name.toLowerCase();
      return (overrides.headers as any)?.[key] ?? (overrides.headers as any)?.[name];
    }),
    ...overrides
  } as unknown as Request);

const createRes = (): Response => {
  const emitter = new EventEmitter() as Response & EventEmitter & {
    _statusCode?: number;
    _headers?: Record<string, string>;
  };

  emitter._statusCode = 200;
  emitter._headers = {};

  emitter.status = jest.fn(function status(this: any, code: number) {
    this._statusCode = code;
    return this;
  }) as any;

  emitter.set = jest.fn(function set(this: any, field: string | Record<string, string>, value?: string) {
    if (typeof field === 'string' && value !== undefined) {
      this._headers[field] = value;
    } else if (typeof field === 'object') {
      this._headers = { ...this._headers, ...field };
    }
    return this;
  }) as any;

  emitter.json = jest.fn(function json(this: any, data: unknown) {
    (this as any).payload = data;
    return this;
  }) as any;

  emitter.send = jest.fn(function send(this: any, data: unknown) {
    (this as any).payload = data;
    return this;
  }) as any;

  return emitter as unknown as Response;
};

describe('caching.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheGetMock.mockResolvedValue(null);
    cacheSetMock.mockResolvedValue(true);
    cacheInvalidateByTagsMock.mockResolvedValue(0);
    cacheGetStatsMock.mockResolvedValue({
      strategies: [{ name: 'memory', ready: true }]
    });
  });

  it('cacheResponse skips non-cacheable requests and calls next immediately', async () => {
    const middleware = cacheResponse();
    const req = createReq({ method: 'POST' });
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(cacheGetMock).not.toHaveBeenCalled();
  });

  it('cacheResponse serves cached response on cache hit', async () => {
    const middleware = cacheResponse();
    const req = createReq({ method: 'GET', path: '/products', query: { page: '1' } });
    const res = createRes();
    const next = jest.fn() as NextFunction;
    cacheGetMock.mockResolvedValue({
      statusCode: 203,
      headers: { 'content-type': 'application/json' },
      body: { cached: true }
    });

    await middleware(req, res, next);

    expect(cacheGetMock).toHaveBeenCalledWith('http:GET:/products?page=1');
    expect((res.status as any).mock.calls[0][0]).toBe(203);
    expect((res.send as any).mock.calls[0][0]).toEqual({ cached: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('cacheResponse stores successful cache miss response on finish', async () => {
    const middleware = cacheResponse({ ttl: 120, tags: ['orders'] });
    const req = createReq({ method: 'GET', path: '/orders', query: { status: 'new' } });
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    (res.status as any)(201);
    (res.json as any)({ ok: true });
    (res as any).emit('finish');
    await new Promise(resolve => setImmediate(resolve));

    expect(cacheSetMock).toHaveBeenCalledWith(
      'http:GET:/orders?status=new',
      expect.objectContaining({
        statusCode: 201,
        body: { ok: true }
      }),
      expect.objectContaining({
        ttl: 120,
        tags: expect.arrayContaining(['orders', 'method:GET', 'path:/orders'])
      })
    );
  });

  it('cacheResponse handles cache read errors and continues request', async () => {
    const middleware = cacheResponse();
    const req = createReq({ method: 'GET', path: '/orders' });
    const res = createRes();
    const next = jest.fn() as NextFunction;
    cacheGetMock.mockRejectedValue(new Error('cache broken'));

    await middleware(req, res, next);

    expect(loggerErrorMock).toHaveBeenCalled();
    expect((res.set as any).mock.calls.some((c: any[]) => c[0] === 'X-Cache' && c[1] === 'ERROR')).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('cacheInvalidation invalidates by matching tags after response finish', async () => {
    const middleware = cacheInvalidation({
      patterns: [
        { method: 'POST', path: /^\/orders/, tags: ['orders', 'status'] }
      ]
    });
    const req = createReq({ method: 'POST', path: '/orders/123' });
    const res = createRes();
    const next = jest.fn() as NextFunction;
    cacheInvalidateByTagsMock.mockResolvedValue(3);

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    (res as any).emit('finish');
    await new Promise(resolve => setImmediate(resolve));

    expect(cacheInvalidateByTagsMock).toHaveBeenCalledWith(['orders', 'status']);
    expect(loggerInfoMock).toHaveBeenCalled();
  });

  it('cacheBypass sets bypass header and cacheStats publishes stats header', async () => {
    const bypass = cacheBypass();
    const stats = cacheStats();
    const req = createReq();
    const res = createRes();
    const next = jest.fn() as NextFunction;

    bypass(req, res, next);
    expect((res.set as any).mock.calls.some((c: any[]) => c[0] === 'X-Cache-Bypass' && c[1] === 'true')).toBe(true);

    await stats(req, res, next);
    (res as any).emit('finish');
    await new Promise(resolve => setImmediate(resolve));

    expect(cacheGetStatsMock).toHaveBeenCalled();
    expect((res.set as any).mock.calls.some((c: any[]) => c[0] === 'X-Cache-Stats')).toBe(true);
  });

  it('CacheWarmer runs tasks and tracks failures, then clears task list', async () => {
    const warmer = new CacheWarmer();
    const successTask = jest.fn().mockResolvedValue(undefined);
    const failTask = jest.fn().mockRejectedValue(new Error('warm fail'));
    warmer.addTask(successTask);
    warmer.addTask(failTask);

    await warmer.warm();

    expect(successTask).toHaveBeenCalled();
    expect(failTask).toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith('Cache warming completed', { successful: 1, failed: 1 });
    expect(loggerWarnMock).toHaveBeenCalledWith('1 cache warming tasks failed');

    warmer.clear();
    await warmer.warm();
    expect(loggerInfoMock).toHaveBeenCalledWith('Starting cache warming with 0 tasks');
  });
});
