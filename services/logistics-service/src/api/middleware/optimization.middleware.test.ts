const cacheGet = jest.fn();
const cacheSet = jest.fn();
const cacheStats = jest.fn(() => ({ keys: 2 }));
const perfRecord = jest.fn();
const perfReport = jest.fn(() => ({ p95: 120 }));

jest.mock('../../domain/engines/super-efficiency-optimizer.engine', () => ({
  SuperEfficiencyOptimizer: class SuperEfficiencyOptimizer {},
  CacheManager: {
    getInstance: jest.fn(() => ({
      get: cacheGet,
      set: cacheSet,
      getStats: cacheStats
    }))
  },
  PerformanceMonitor: class PerformanceMonitor {
    recordMetric(metric: unknown) {
      perfRecord(metric);
    }
    getPerformanceReport() {
      return perfReport();
    }
  }
}));

import type { Request, Response } from 'express';
import { OptimizationMiddleware, QueryOptimizer } from './optimization.middleware';

describe('OptimizationMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cache middleware bypasses non-GET requests', async () => {
    const next = jest.fn();
    const req = { method: 'POST', originalUrl: '/api/x', query: {} } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;

    await OptimizationMiddleware.cache()(req, res, next);

    expect(cacheGet).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('cache middleware returns cached payload for GET requests', async () => {
    cacheGet.mockResolvedValueOnce({ cached: true });
    const next = jest.fn();
    const req = { method: 'GET', originalUrl: '/api/x', query: { page: 1 } } as unknown as Request;
    const res = { json: jest.fn() } as unknown as Response;

    await OptimizationMiddleware.cache()(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ cached: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('cache middleware wraps response json and stores result on cache miss', async () => {
    cacheGet.mockResolvedValueOnce(null);
    const next = jest.fn();
    const req = { method: 'GET', originalUrl: '/api/x', query: { page: 2 } } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await OptimizationMiddleware.cache(1234)(req, res, next);
    const payload = { ok: true };
    (res as unknown as { json: (arg: unknown) => unknown }).json(payload);

    expect(next).toHaveBeenCalledTimes(1);
    expect(cacheSet).toHaveBeenCalledWith('/api/x_{"page":2}', payload, 1234);
    expect(json).toHaveBeenCalledWith(payload);
  });

  it('monitor middleware records response metrics when response finishes', () => {
    const next = jest.fn();
    const finishHandlers: Array<() => void> = [];
    const req = {} as Request;
    const res = {
      statusCode: 200,
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') finishHandlers.push(handler);
      })
    } as unknown as Response;

    OptimizationMiddleware.monitor()(req, res, next);
    finishHandlers.forEach(fn => fn());

    expect(next).toHaveBeenCalledTimes(1);
    expect(perfRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        responseTime: expect.any(Number),
        errorRate: 0
      })
    );
  });

  it('monitor middleware records errorRate=1 for error responses', () => {
    const next = jest.fn();
    const finishHandlers: Array<() => void> = [];
    const req = {} as Request;
    const res = {
      statusCode: 500,
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') finishHandlers.push(handler);
      })
    } as unknown as Response;

    OptimizationMiddleware.monitor()(req, res, next);
    finishHandlers.forEach(fn => fn());

    expect(perfRecord).toHaveBeenCalledWith(expect.objectContaining({ errorRate: 1 }));
  });

  it('getStats returns cache and performance snapshots', () => {
    const stats = OptimizationMiddleware.getStats();

    expect(cacheStats).toHaveBeenCalledTimes(1);
    expect(perfReport).toHaveBeenCalledTimes(1);
    expect(stats).toEqual({
      cache: { keys: 2 },
      performance: { p95: 120 }
    });
  });
});

describe('QueryOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    QueryOptimizer.destroy();
  });

  afterEach(() => {
    QueryOptimizer.destroy();
    jest.useRealTimers();
  });

  it('caches query results and avoids duplicate query execution within ttl', async () => {
    const queryFn = jest.fn().mockResolvedValue({ value: 42 });

    const first = await QueryOptimizer.optimizeQuery('k1', queryFn, 1000);
    const second = await QueryOptimizer.optimizeQuery('k1', queryFn, 1000);

    expect(first).toEqual({ value: 42 });
    expect(second).toEqual({ value: 42 });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('re-executes query after ttl expiration', async () => {
    jest.useFakeTimers();
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockResolvedValueOnce({ value: 2 });

    const first = await QueryOptimizer.optimizeQuery('k2', queryFn, 10);
    jest.advanceTimersByTime(20);
    const second = await QueryOptimizer.optimizeQuery('k2', queryFn, 10);

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 2 });
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('destroy clears cache and allows fresh query execution', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce({ value: 'initial' })
      .mockResolvedValueOnce({ value: 'after-destroy' });

    await QueryOptimizer.optimizeQuery('k3', queryFn, 1000);
    QueryOptimizer.destroy();
    const afterDestroy = await QueryOptimizer.optimizeQuery('k3', queryFn, 1000);

    expect(afterDestroy).toEqual({ value: 'after-destroy' });
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});

