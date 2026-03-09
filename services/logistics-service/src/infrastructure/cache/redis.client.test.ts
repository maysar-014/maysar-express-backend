const mockCreateClient = jest.fn();

jest.mock('../../config/redis.config', () => ({
  RedisConfiguration: {
    getInstance: () => ({
      createClient: mockCreateClient
    })
  }
}));

import { RedisClientManager } from './redis.client';

describe('RedisClientManager', () => {
  const client = {
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    setEx: jest.fn().mockResolvedValue('OK'),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('value'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(1)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(client);
    delete (RedisClientManager as any).instance;
  });

  afterAll(() => {
    delete (RedisClientManager as any).instance;
  });

  it('connects lazily and exposes cache operations', async () => {
    const manager = RedisClientManager.getInstance();

    await manager.set('k1', 'v1', 30);
    await manager.set('k2', 'v2');
    await manager.get('k1');
    await manager.del('k1');
    const exists = await manager.exists('k1');

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(client.setEx).toHaveBeenCalledWith('k1', 30, 'v1');
    expect(client.set).toHaveBeenCalledWith('k2', 'v2');
    expect(client.get).toHaveBeenCalledWith('k1');
    expect(client.del).toHaveBeenCalledWith('k1');
    expect(exists).toBe(true);
    expect(manager.isHealthy()).toBe(true);
  });

  it('returns unhealthy health check when ping fails', async () => {
    const manager = RedisClientManager.getInstance();
    await manager.getClient();
    client.ping.mockRejectedValueOnce(new Error('down'));

    const health = await manager.healthCheck();

    expect(health.status).toBe('unhealthy');
  });

  it('disconnects and reconnects', async () => {
    const manager = RedisClientManager.getInstance();

    await manager.getClient();
    await manager.disconnect();
    await manager.getClient();

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledTimes(2);
  });
});
