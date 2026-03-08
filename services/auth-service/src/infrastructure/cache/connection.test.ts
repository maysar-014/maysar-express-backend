describe('redis connection', () => {
  const previousEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('creates redis client with configured URL and pings on initialization', async () => {
    process.env.REDIS_URL = 'redis://localhost:6380';
    const pingMock = jest.fn().mockResolvedValue('PONG');
    const redisConstructor = jest.fn().mockImplementation(() => ({
      ping: pingMock
    }));

    jest.doMock('ioredis', () => ({
      __esModule: true,
      default: redisConstructor
    }));

    const { redis, initializeRedis } = await import('./connection');

    expect(redis).toBeDefined();
    expect(redisConstructor).toHaveBeenCalledWith('redis://localhost:6380');
    await initializeRedis();
    expect(pingMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to localhost URL when REDIS_URL is not provided', async () => {
    delete process.env.REDIS_URL;
    const redisConstructor = jest.fn().mockImplementation(() => ({
      ping: jest.fn().mockResolvedValue('PONG')
    }));

    jest.doMock('ioredis', () => ({
      __esModule: true,
      default: redisConstructor
    }));

    await import('./connection');

    expect(redisConstructor).toHaveBeenCalledWith('redis://localhost:6379');
  });
});
