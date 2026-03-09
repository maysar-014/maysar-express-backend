export {};

const waitForAsyncWork = async (): Promise<void> => {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
};

describe('status-report script', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('prints operational report when all checks succeed', async () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('dotenv/config', () => ({}), { virtual: true });
    jest.doMock('./engines/logistics.engine', () => ({
      LogisticsEngine: class {
        processLogisticsRequest = jest.fn().mockResolvedValue({
          deliveryId: 'del-status',
          shippingCost: 7800,
          confidence: 96
        });
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/database/supabase.client', () => ({
      SupabaseClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', latency: 15 })
        }))
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/cache/redis.client', () => ({
      RedisClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', latency: 4 })
        }))
      }
    }), { virtual: true });

    require('./status-report');
    await waitForAsyncWork();

    expect(logs.some(line => line.includes('LOGISTICS SERVICE STATUS REPORT'))).toBe(true);
    expect(logs.some(line => line.includes('Supabase: healthy'))).toBe(true);
    expect(logs.some(line => line.includes('Redis/Memurai: healthy'))).toBe(true);
    expect(logs.some(line => line.includes('LOGISTICS SERVICE IS FULLY OPERATIONAL'))).toBe(true);
  });

  it('prints dependency errors when checks fail', async () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('dotenv/config', () => ({}), { virtual: true });
    jest.doMock('./engines/logistics.engine', () => ({
      LogisticsEngine: class {
        processLogisticsRequest = jest.fn().mockRejectedValue(new Error('engine down'));
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/database/supabase.client', () => ({
      SupabaseClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockRejectedValue(new Error('db down')),
          healthCheck: jest.fn()
        }))
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/cache/redis.client', () => ({
      RedisClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockRejectedValue(new Error('redis down')),
          healthCheck: jest.fn()
        }))
      }
    }), { virtual: true });

    require('./status-report');
    await waitForAsyncWork();

    expect(logs.some(line => line.includes('Supabase: Error - db down'))).toBe(true);
    expect(logs.some(line => line.includes('Redis/Memurai: Error - redis down'))).toBe(true);
    expect(logs.some(line => line.includes('Engine: Error - engine down'))).toBe(true);
  });
});
