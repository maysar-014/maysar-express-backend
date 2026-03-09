export {};

const waitForAsyncWork = async (): Promise<void> => {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
};

describe('diagnostic-runner script', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('runs diagnostics and prints healthy overall status when dependencies are healthy', async () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('dotenv/config', () => ({}), { virtual: true });
    jest.doMock('./utils/logger', () => ({
      Logger: { getInstance: jest.fn(() => ({ info: jest.fn(), error: jest.fn() })) }
    }), { virtual: true });
    jest.doMock('./config/app.config', () => ({
      AppConfiguration: {
        getInstance: jest.fn(() => ({
          getServiceInfo: () => ({ name: 'logistics', version: '1.0.0' }),
          getConfig: () => ({ port: 3007, environment: 'test', cors: true })
        }))
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/database/supabase.client', () => ({
      SupabaseClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', latency: 12 })
        }))
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/cache/redis.client', () => ({
      RedisClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', latency: 5 })
        }))
      }
    }), { virtual: true });
    jest.doMock('./engines/logistics.engine', () => ({
      LogisticsEngine: class {
        processLogisticsRequest = jest.fn().mockResolvedValue({
          success: true,
          deliveryId: 'del-1',
          shippingCost: 5500,
          confidence: 97,
          processingTime: 24,
          warnings: [],
          recommendations: []
        });
      }
    }), { virtual: true });

    require('./diagnostic-runner');
    await waitForAsyncWork();

    expect(logs.some(line => line.includes('Diagnostic Results'))).toBe(true);
    expect(logs.some(line => line.includes('Overall Status: HEALTHY'))).toBe(true);
    expect(logs.some(line => line.includes('Healthy: 5'))).toBe(true);
  });

  it('reports critical status when a core dependency check fails', async () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.doMock('dotenv/config', () => ({}), { virtual: true });
    jest.doMock('./utils/logger', () => ({
      Logger: { getInstance: jest.fn(() => ({ info: jest.fn(), error: jest.fn() })) }
    }), { virtual: true });
    jest.doMock('./config/app.config', () => ({
      AppConfiguration: {
        getInstance: jest.fn(() => ({
          getServiceInfo: () => ({ name: 'logistics', version: '1.0.0' }),
          getConfig: () => ({ port: 3007, environment: 'test', cors: true })
        }))
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/database/supabase.client', () => ({
      SupabaseClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockRejectedValue(new Error('database unavailable')),
          healthCheck: jest.fn()
        }))
      }
    }), { virtual: true });
    jest.doMock('./infrastructure/cache/redis.client', () => ({
      RedisClientManager: {
        getInstance: jest.fn(() => ({
          connect: jest.fn().mockResolvedValue(undefined),
          healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', latency: 5 })
        }))
      }
    }), { virtual: true });
    jest.doMock('./engines/logistics.engine', () => ({
      LogisticsEngine: class {
        processLogisticsRequest = jest.fn().mockResolvedValue({
          success: true,
          deliveryId: 'del-1',
          shippingCost: 5500,
          confidence: 97,
          processingTime: 24,
          warnings: [],
          recommendations: []
        });
      }
    }), { virtual: true });

    require('./diagnostic-runner');
    await waitForAsyncWork();

    expect(logs.some(line => line.includes('Errors: 1'))).toBe(true);
    expect(logs.some(line => line.includes('Overall Status: CRITICAL'))).toBe(true);
    expect(logs.some(line => line.includes('database unavailable'))).toBe(true);
  });
});
