import { createClient } from 'redis';
import { RedisCache } from './redis-cache';

jest.mock('redis', () => ({
  createClient: jest.fn()
}));

jest.mock(
  '@modules/auth-service/src/infrastructure/services/logger.service',
  () => ({
    logger: {
      error: jest.fn(),
      info: jest.fn()
    }
  }),
  { virtual: true }
);

type EventHandler = (...args: unknown[]) => void;

interface MockPipeline {
  setEx: jest.Mock;
  exec: jest.Mock;
}

interface MockRedisClient {
  on: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  get: jest.Mock;
  mGet: jest.Mock;
  setEx: jest.Mock;
  multi: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
  incrBy: jest.Mock;
  decrBy: jest.Mock;
  keys: jest.Mock;
  flushDb: jest.Mock;
}

describe('RedisCache', () => {
  let cache: RedisCache;
  let mockClient: MockRedisClient;
  let mockPipeline: MockPipeline;
  let handlers: Record<string, EventHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};

    mockPipeline = {
      setEx: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    };

    mockClient = {} as MockRedisClient;
    mockClient.on = jest.fn((event: string, handler: EventHandler) => {
      handlers[event] = handler;
      return mockClient;
    });
    mockClient.connect = jest.fn().mockResolvedValue(undefined);
    mockClient.disconnect = jest.fn().mockResolvedValue(undefined);
    mockClient.get = jest.fn().mockResolvedValue(null);
    mockClient.mGet = jest.fn().mockResolvedValue([]);
    mockClient.setEx = jest.fn().mockResolvedValue('OK');
    mockClient.multi = jest.fn().mockReturnValue(mockPipeline);
    mockClient.del = jest.fn().mockResolvedValue(0);
    mockClient.exists = jest.fn().mockResolvedValue(0);
    mockClient.expire = jest.fn().mockResolvedValue(1);
    mockClient.ttl = jest.fn().mockResolvedValue(30);
    mockClient.incrBy = jest.fn().mockResolvedValue(3);
    mockClient.decrBy = jest.fn().mockResolvedValue(2);
    mockClient.keys = jest.fn().mockResolvedValue([]);
    mockClient.flushDb = jest.fn().mockResolvedValue('OK');

    (createClient as jest.Mock).mockReturnValue(mockClient);
    cache = new RedisCache('redis://cache.local:6379', 120);
  });

  it('registers redis event handlers and updates connection health', () => {
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));

    handlers.connect?.();
    expect(cache.isHealthy()).toBe(true);

    handlers.disconnect?.();
    expect(cache.isHealthy()).toBe(false);
  });

  it('connects only when disconnected and disconnects when connected', async () => {
    await cache.connect();
    expect(mockClient.connect).toHaveBeenCalledTimes(1);

    await cache.disconnect();
    expect(mockClient.disconnect).toHaveBeenCalledTimes(0);

    handlers.connect?.();
    await cache.disconnect();
    expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
  });

  it('reads and writes cache entries with default and custom ttl', async () => {
    mockClient.get.mockResolvedValueOnce('cached-value');
    expect(await cache.get('key:1')).toBe('cached-value');

    await cache.set('key:1', 'value');
    expect(mockClient.setEx).toHaveBeenCalledWith('key:1', 120, 'value');

    await cache.set('key:2', 'value', 42);
    expect(mockClient.setEx).toHaveBeenCalledWith('key:2', 42, 'value');
  });

  it('returns safe fallbacks when get/mget fail', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('GET failed'));
    expect(await cache.get('missing')).toBeNull();

    mockClient.mGet.mockRejectedValueOnce(new Error('MGET failed'));
    expect(await cache.mget(['k1', 'k2'])).toEqual([null, null]);
  });

  it('supports batched writes and community cache helpers', async () => {
    await cache.mset([
      { key: 'feed:user:1', value: 'a' },
      { key: 'post:1', value: 'b', ttl: 10 }
    ]);
    expect(mockClient.multi).toHaveBeenCalledTimes(1);
    expect(mockPipeline.setEx).toHaveBeenNthCalledWith(1, 'feed:user:1', 120, 'a');
    expect(mockPipeline.setEx).toHaveBeenNthCalledWith(2, 'post:1', 10, 'b');
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);

    await cache.cacheUserFeed('u-1', { items: ['x'] }, 60);
    expect(mockClient.setEx).toHaveBeenLastCalledWith('feed:user:u-1', 60, '{"items":["x"]}');

    mockClient.get.mockResolvedValueOnce('{"items":["x"]}');
    expect(await cache.getCachedUserFeed('u-1')).toEqual({ items: ['x'] });
  });

  it('invalidates user and post caches through delete operations', async () => {
    await cache.invalidateUserCache('u-77');
    expect(mockClient.del).toHaveBeenCalledWith(['feed:user:u-77', 'engagement:user:u-77']);

    mockClient.del.mockResolvedValueOnce(1);
    expect(await cache.delete('post:88')).toBe(true);

    await cache.invalidatePostCache('88');
    expect(mockClient.del).toHaveBeenLastCalledWith('post:88');
  });
});
