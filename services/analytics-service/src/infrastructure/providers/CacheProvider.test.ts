const getMock = jest.fn();
const setMock = jest.fn();
const delMock = jest.fn();
const redisConstructorMock = jest.fn().mockImplementation(() => ({
  get: getMock,
  set: setMock,
  del: delMock
}));

jest.mock('ioredis', () => ({
  __esModule: true,
  default: redisConstructorMock
}));

import { CacheProvider } from './CacheProvider';

describe('CacheProvider', () => {
  const previousEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('builds redis client from environment host and port', async () => {
    process.env.REDIS_HOST = 'cache.internal';
    process.env.REDIS_PORT = '6391';

    const provider = new CacheProvider();

    expect(provider).toBeDefined();
    expect(redisConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'cache.internal',
        port: 6391,
        retryStrategy: expect.any(Function)
      })
    );
  });

  it('delegates get/set/delete operations to redis client', async () => {
    getMock.mockResolvedValue('cached');
    setMock.mockResolvedValue('OK');
    delMock.mockResolvedValue(1);

    const provider = new CacheProvider();

    await expect(provider.get('k1')).resolves.toBe('cached');
    await provider.set('k2', 'v2');
    await provider.set('k3', 'v3', 60);
    await provider.delete('k4');

    expect(getMock).toHaveBeenCalledWith('k1');
    expect(setMock).toHaveBeenNthCalledWith(1, 'k2', 'v2');
    expect(setMock).toHaveBeenNthCalledWith(2, 'k3', 'v3', 'EX', 60);
    expect(delMock).toHaveBeenCalledWith('k4');
  });

  it('loads production cache-provider module and validates no-op behavior', async () => {
    const productionModule = await import('../../../../production-service/src/infrastructure/providers/CacheProvider');
    const productionProvider = new productionModule.CacheProvider();

    await expect(productionProvider.get('missing')).resolves.toBeNull();
    await expect(productionProvider.set('k', 'v', 10)).resolves.toBeUndefined();
  });
});
