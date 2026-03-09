import { createClient } from 'redis';
import { RedisConfiguration } from './redis.config';

jest.mock('redis', () => ({
  createClient: jest.fn()
}));

const ORIGINAL_ENV = process.env;

describe('RedisConfiguration', () => {
  const mockClient = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete (RedisConfiguration as any).instance;
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    delete (RedisConfiguration as any).instance;
  });

  it('creates and caches a redis client with configured options', async () => {
    process.env.REDIS_HOST = 'redis.local';
    process.env.REDIS_PORT = '6390';
    process.env.REDIS_DB = '2';
    process.env.REDIS_CONNECT_TIMEOUT = '15000';

    const config = RedisConfiguration.getInstance();
    const first = await config.createClient();
    const second = await config.createClient();

    expect(first).toBe(mockClient);
    expect(second).toBe(mockClient);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith({
      socket: {
        host: 'redis.local',
        port: 6390,
        connectTimeout: 15000
      },
      password: undefined,
      database: 2
    });
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  it('returns true for successful ping and false when ping fails', async () => {
    const config = RedisConfiguration.getInstance();

    await expect(config.testConnection()).resolves.toBe(true);
    expect(mockClient.ping).toHaveBeenCalledTimes(1);

    mockClient.ping.mockRejectedValueOnce(new Error('down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(config.testConnection()).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('Redis connection test failed:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('disconnects and resets client instance', async () => {
    const config = RedisConfiguration.getInstance();

    await config.createClient();
    await config.disconnect();
    await config.createClient();

    expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(2);
  });
});
