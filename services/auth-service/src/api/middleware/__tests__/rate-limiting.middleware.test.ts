const mockExpressRateLimit = jest.fn((options: unknown) => options);
const mockRedisCtor = jest.fn((url?: string) => ({ mocked: true, url }));
const mockRedisRateLimitStore = jest.fn((_client: unknown, prefix: string) => ({ prefix }));

jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: (options: unknown) => mockExpressRateLimit(options)
}));

jest.mock('ioredis', () => ({
  __esModule: true,
  default: function Redis(url: string) {
    return mockRedisCtor(url);
  }
}));

jest.mock('@shared/middleware/redis-rate-limit.store', () => ({
  RedisRateLimitStore: function RedisRateLimitStore(client: unknown, prefix: string) {
    return mockRedisRateLimitStore(client, prefix);
  }
}));

describe('rate-limiting middleware', () => {
  const importModule = async () => {
    jest.resetModules();
    return import('../rate-limiting.middleware');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL;
  });

  it('builds default limiters and aliases rateLimiter to generalLimiter', async () => {
    const module = await importModule();

    expect(module.rateLimiter).toBe(module.generalLimiter);
    expect(mockRedisCtor).toHaveBeenCalledWith('redis://localhost:6379');
    expect(mockExpressRateLimit).toHaveBeenCalledTimes(3);

    const configuredPrefixes = mockRedisRateLimitStore.mock.calls.map(call => call[1]);
    expect(configuredPrefixes).toEqual(expect.arrayContaining(['rl:general:', 'rl:strict:', 'rl:login:']));
  });

  it('creates dynamic rate-limit middleware with provided options', async () => {
    const module = await importModule();
    mockExpressRateLimit.mockClear();
    mockRedisRateLimitStore.mockClear();

    module.rateLimit({
      windowMs: 1000,
      max: 9,
      message: 'stop',
      skipFailedRequests: true,
      skipSuccessfulRequests: true,
      prefix: 'rl:custom:'
    });

    expect(mockExpressRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 1000,
        max: 9,
        message: 'stop',
        skipFailedRequests: true,
        skipSuccessfulRequests: true
      })
    );
    expect(mockRedisRateLimitStore).toHaveBeenCalledWith(expect.any(Object), 'rl:custom:');
  });

  it('merges defaults in createRateLimit when options are partial', async () => {
    const module = await importModule();
    mockExpressRateLimit.mockClear();

    module.createRateLimit({ max: 42 });

    expect(mockExpressRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 15 * 60 * 1000,
        max: 42,
        skipFailedRequests: false,
        skipSuccessfulRequests: false
      })
    );
  });
});
