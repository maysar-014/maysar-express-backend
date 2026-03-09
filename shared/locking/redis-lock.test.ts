export {};

const randomUUIDMock = jest.fn();

jest.mock('crypto', () => ({
  randomUUID: () => randomUUIDMock()
}));

import { RedisLock } from './redis-lock';

interface RedisClientMock {
  set: jest.Mock<Promise<string | null>, [string, string, ...Array<string | number>]>;
  del: jest.Mock<Promise<number>, [string]>;
  eval?: jest.Mock<Promise<number | null>, [string, number, ...Array<string | number>]>;
}

const createRedisClient = (): RedisClientMock => ({
  set: jest.fn(),
  del: jest.fn(),
  eval: jest.fn()
});

describe('RedisLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    randomUUIDMock.mockReturnValue('token-1');
  });

  it('acquires lock and stores ownership token when redis set succeeds', async () => {
    const redis = createRedisClient();
    redis.set.mockResolvedValue('OK');
    const lock = new RedisLock(redis, { retries: 0 });

    const acquired = await lock.acquireLock('order:1', 8000);

    expect(acquired).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('lock:order:1', 'token-1', 'PX', 8000, 'NX');
  });

  it('returns false when lock acquisition exhausts retries', async () => {
    const redis = createRedisClient();
    redis.set.mockResolvedValue(null);
    const lock = new RedisLock(redis, { retries: 2, retryDelayMs: 0, maxRetryDelayMs: 0 });

    const acquired = await lock.acquire('order:2', 1000);

    expect(acquired).toBe(false);
    expect(redis.set).toHaveBeenCalledTimes(3);
  });

  it('releases lock using lua compare-and-delete when token is owned', async () => {
    const redis = createRedisClient();
    redis.set.mockResolvedValue('OK');
    redis.eval!.mockResolvedValue(1);
    const lock = new RedisLock(redis, { retries: 0 });
    await lock.acquire('order:3', 5000);

    await lock.release('order:3');

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'),
      1,
      'lock:order:3',
      'token-1'
    );
  });

  it('release is a no-op when lock was never acquired', async () => {
    const redis = createRedisClient();
    const lock = new RedisLock(redis);

    await lock.releaseLock('unknown');

    expect(redis.eval).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('withLock executes callback and always releases lock after success', async () => {
    const redis = createRedisClient();
    redis.set.mockResolvedValue('OK');
    redis.eval!.mockResolvedValue(1);
    const lock = new RedisLock(redis, { retries: 0 });

    const result = await lock.withLock('order:4', async () => 'done');

    expect(result).toBe('done');
    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it('withLock throws when lock cannot be acquired', async () => {
    const redis = createRedisClient();
    redis.set.mockResolvedValue(null);
    const lock = new RedisLock(redis, { retries: 0 });

    await expect(lock.withLock('order:5', async () => 'x')).rejects.toThrow('Failed to acquire lock: order:5');
  });

  it('withLock releases lock even when callback throws', async () => {
    const redis = createRedisClient();
    redis.set.mockResolvedValue('OK');
    redis.eval!.mockResolvedValue(1);
    const lock = new RedisLock(redis, { retries: 0 });

    await expect(
      lock.withLock('order:6', async () => {
        throw new Error('callback failed');
      })
    ).rejects.toThrow('callback failed');

    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it('supports withLock overload signature (key, ttl, fn)', async () => {
    const redis = createRedisClient();
    redis.set.mockResolvedValue('OK');
    redis.eval!.mockResolvedValue(1);
    const lock = new RedisLock(redis, { retries: 0 });

    const result = await lock.withLock('order:7', 10000, async () => 'ok');

    expect(result).toBe('ok');
    expect(redis.set).toHaveBeenCalledWith('lock:order:7', 'token-1', 'PX', 10000, 'NX');
  });

  it('throws for invalid withLock arguments without callback', async () => {
    const redis = createRedisClient();
    const lock = new RedisLock(redis, { retries: 0 });

    await expect((lock as any).withLock('order:8', 5000)).rejects.toThrow(
      'withLock requires an async callback function.'
    );
  });
});
