import { RedisRateLimitStore } from './redis-rate-limit.store';

describe('RedisRateLimitStore', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('increments rate-limit key and returns hit count with reset time', async () => {
    const redisClient = {
      eval: jest.fn().mockResolvedValue([3, 5000]),
      decr: jest.fn(),
      del: jest.fn()
    };
    const store = new RedisRateLimitStore(redisClient as never, 'rl-test:');
    store.init({ windowMs: 60_000 } as never);
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    const result = await store.increment('ip-1');

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.stringContaining('INCR'),
      1,
      'rl-test:ip-1',
      60_000
    );
    expect(result.totalHits).toBe(3);
    expect(result.resetTime).toBeDefined();
    expect(result.resetTime!.getTime()).toBe(6_000);
  });

  it('decrements and resets keys', async () => {
    const redisClient = {
      eval: jest.fn(),
      decr: jest.fn().mockResolvedValue(0),
      del: jest.fn().mockResolvedValue(1)
    };
    const store = new RedisRateLimitStore(redisClient as never, 'rl-test:');

    await store.decrement('ip-1');
    await store.resetKey('ip-1');

    expect(redisClient.decr).toHaveBeenCalledWith('rl-test:ip-1');
    expect(redisClient.del).toHaveBeenCalledWith('rl-test:ip-1');
  });
});
