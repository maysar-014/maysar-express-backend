export {};

const recordDatabaseQueryMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerErrorMock = jest.fn();

const redisGetMock = jest.fn();
const redisSetMock = jest.fn();
const redisDeleteMock = jest.fn();
const redisClearMock = jest.fn();
const redisIsReadyMock = jest.fn();
const redisInvalidateByTagsMock = jest.fn();
const redisGetStatsMock = jest.fn();

jest.mock('./redis-cache', () => {
  class MockRedisCache {
    name = 'redis';
    get = (...args: any[]) => redisGetMock(...args);
    set = (...args: any[]) => redisSetMock(...args);
    delete = (...args: any[]) => redisDeleteMock(...args);
    clear = (...args: any[]) => redisClearMock(...args);
    isReady = () => redisIsReadyMock();
    invalidateByTags = (...args: any[]) => redisInvalidateByTagsMock(...args);
    getStats = (...args: any[]) => redisGetStatsMock(...args);
  }

  return {
    RedisCache: MockRedisCache,
    redisCache: new MockRedisCache()
  };
});

jest.mock('../monitoring/logger', () => ({
  appLogger: {
    warn: (...args: any[]) => loggerWarnMock(...args),
    error: (...args: any[]) => loggerErrorMock(...args)
  }
}));

jest.mock('../monitoring/metrics', () => ({
  metricsCollector: {
    recordDatabaseQuery: (...args: any[]) => recordDatabaseQueryMock(...args)
  }
}));

import { CacheManager, MemoryCache, cacheAside as cacheAsideFn, cacheManager } from './cache-manager';
import { RedisCache } from './redis-cache';

const createStrategy = (name: string, overrides: Partial<{
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
  clear: jest.Mock;
  isReady: jest.Mock;
}> = {}) => ({
  name,
  get: overrides.get ?? jest.fn().mockResolvedValue(null),
  set: overrides.set ?? jest.fn().mockResolvedValue(true),
  delete: overrides.delete ?? jest.fn().mockResolvedValue(true),
  clear: overrides.clear ?? jest.fn().mockResolvedValue(undefined),
  isReady: overrides.isReady ?? jest.fn().mockReturnValue(true)
});

describe('CacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisGetMock.mockResolvedValue(null);
    redisSetMock.mockResolvedValue(true);
    redisDeleteMock.mockResolvedValue(true);
    redisClearMock.mockResolvedValue(undefined);
    redisIsReadyMock.mockReturnValue(true);
    redisInvalidateByTagsMock.mockResolvedValue(0);
    redisGetStatsMock.mockResolvedValue({ keys: 0 });
  });

  it('MemoryCache stores values with ttl and expires stale entries', async () => {
    const memory = new MemoryCache();
    await memory.set('k1', { v: 1 }, { ttl: 1 });
    expect(await memory.get('k1')).toEqual({ v: 1 });

    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
    expect(await memory.get('k1')).toBeNull();
  });

  it('returns value from first ready strategy hit and records cache hit metric', async () => {
    const memory = createStrategy('memory', { get: jest.fn().mockResolvedValue({ cached: true }) });
    const redis = createStrategy('redis', { get: jest.fn().mockResolvedValue({ cached: false }) });
    const manager = new CacheManager({ strategies: [memory as any, redis as any] });

    const result = await manager.get('order:1');

    expect(result).toEqual({ cached: true });
    expect(recordDatabaseQueryMock).toHaveBeenCalledWith('cache_hit', 'memory', 0, true);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('returns null on cache miss and records cache miss metric', async () => {
    const memory = createStrategy('memory', { get: jest.fn().mockResolvedValue(null) });
    const redis = createStrategy('redis', { get: jest.fn().mockResolvedValue(null) });
    const manager = new CacheManager({ strategies: [memory as any, redis as any] });

    const result = await manager.get('order:2');

    expect(result).toBeNull();
    expect(recordDatabaseQueryMock).toHaveBeenCalledWith('cache_miss', 'all', 0, true);
  });

  it('sets values across strategies and supports skipMemory', async () => {
    const memorySet = jest.fn().mockResolvedValue(true);
    const redisSet = jest.fn().mockResolvedValue(true);
    const memory = createStrategy('memory', { set: memorySet });
    const redis = createStrategy('redis', { set: redisSet });
    const manager = new CacheManager({ strategies: [memory as any, redis as any], defaultTTL: 60 });

    const result = await manager.set('k', { data: 1 }, { skipMemory: true, tags: ['orders'] });

    expect(result).toBe(true);
    expect(memorySet).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalledWith('k', { data: 1 }, { ttl: 60, tags: ['orders'] });
  });

  it('deletes and clears across ready strategies while swallowing strategy errors', async () => {
    const memoryDelete = jest.fn().mockRejectedValue(new Error('mem down'));
    const redisDelete = jest.fn().mockResolvedValue(true);
    const memoryClear = jest.fn().mockRejectedValue(new Error('mem clear failed'));
    const redisClear = jest.fn().mockResolvedValue(undefined);
    const manager = new CacheManager({
      strategies: [
        createStrategy('memory', { delete: memoryDelete, clear: memoryClear }) as any,
        createStrategy('redis', { delete: redisDelete, clear: redisClear }) as any
      ]
    });

    const deleted = await manager.delete('k3');
    await manager.clear();

    expect(deleted).toBe(true);
    expect(loggerWarnMock).toHaveBeenCalled();
  });

  it('invalidates tags only for RedisCache strategies and aggregates deleted count', async () => {
    const redisStrategy = new (RedisCache as any)();
    const manager = new CacheManager({
      strategies: [createStrategy('memory') as any, redisStrategy]
    });
    redisInvalidateByTagsMock.mockResolvedValue(4);

    const deleted = await manager.invalidateByTags(['orders', 'status']);

    expect(redisInvalidateByTagsMock).toHaveBeenCalledWith(['orders', 'status']);
    expect(deleted).toBe(4);
  });

  it('returns strategy stats and health check status', async () => {
    const manager = new CacheManager({
      strategies: [createStrategy('memory') as any, new (RedisCache as any)()]
    });
    redisGetStatsMock.mockResolvedValue({ keys: 7 });

    const stats = await manager.getStats();

    expect(stats.strategies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'memory', ready: true }),
        expect.objectContaining({ name: 'redis', ready: true, stats: { keys: 7 } })
      ])
    );
    expect(await manager.healthCheck()).toBe(true);
  });

  it('cacheAside returns cached value, supports forceRefresh, and rethrows fetch errors', async () => {
    const manager = new CacheManager({
      strategies: [createStrategy('memory') as any]
    });

    const getSpy = jest.spyOn(manager, 'get').mockResolvedValueOnce({ cached: 'v' } as any).mockResolvedValueOnce(null);
    const setSpy = jest.spyOn(manager, 'set').mockResolvedValue(true);

    const fromCache = await manager.cacheAside('key-a', async () => ({ source: 'db' }));
    const refreshed = await manager.cacheAside(
      'key-b',
      async () => ({ source: 'db' }),
      { forceRefresh: true, ttl: 10, tags: ['x'] }
    );

    expect(fromCache).toEqual({ cached: 'v' });
    expect(refreshed).toEqual({ source: 'db' });
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith('key-b', { source: 'db' }, { ttl: 10, tags: ['x'] });

    await expect(
      manager.cacheAside('key-c', async () => {
        throw new Error('fetch failed');
      })
    ).rejects.toThrow('fetch failed');
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('writeThrough and writeBehind guard rails throw expected errors', async () => {
    const manager = new CacheManager();
    await expect(manager.writeThrough('k', { v: 1 }, async () => undefined)).rejects.toThrow(
      'Write-through caching is not enabled'
    );
    await expect(manager.writeBehind('k', { v: 1 }, async () => undefined)).rejects.toThrow(
      'Write-behind caching is not enabled'
    );
  });

  it('global cacheAside helper delegates to global cacheManager instance', async () => {
    const spy = jest.spyOn(cacheManager, 'cacheAside').mockResolvedValue({ ok: true } as any);

    const result = await cacheAsideFn('global:key', async () => ({ ok: false }));

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});
