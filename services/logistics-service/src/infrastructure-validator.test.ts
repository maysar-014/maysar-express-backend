const flush = async (): Promise<void> => {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
};

interface RunOptions {
  prismaHealthError?: Error;
  repositoryImportError?: Error;
}

const runInfrastructureValidator = async (options: RunOptions = {}) => {
  const logs: string[] = [];

  const dbGetInstance = jest.fn(() => ({
    getConfig: () => ({ maxConnections: 20, connectionTimeout: 5000 })
  }));
  const redisGetInstance = jest.fn(() => ({
    getConfig: () => ({ host: 'localhost', port: 6379 })
  }));
  const kafkaGetInstance = jest.fn(() => ({
    getConfig: () => ({ brokers: ['localhost:9092'], clientId: 'logistics' })
  }));
  const envGetInstance = jest.fn(() => ({
    getConfig: () => ({ nodeEnv: 'test', port: 3015 })
  }));

  const prismaHealthCheck = jest.fn();
  if (options.prismaHealthError) {
    prismaHealthCheck.mockRejectedValue(options.prismaHealthError);
  } else {
    prismaHealthCheck.mockResolvedValue({ ok: true });
  }

  const redisHealthCheck = jest.fn().mockResolvedValue({ ok: true });

  jest.doMock('../config/database.config', () => ({
    DatabaseConfiguration: { getInstance: dbGetInstance }
  }), { virtual: true });
  jest.doMock('../config/redis.config', () => ({
    RedisConfiguration: { getInstance: redisGetInstance }
  }), { virtual: true });
  jest.doMock('../config/kafka.config', () => ({
    KafkaConfiguration: { getInstance: kafkaGetInstance }
  }), { virtual: true });
  jest.doMock('../config/environment.config', () => ({
    EnvironmentConfiguration: { getInstance: envGetInstance }
  }), { virtual: true });

  jest.doMock('../infrastructure/database/prisma.client', () => ({
    PrismaClientManager: { getInstance: jest.fn(() => ({ healthCheck: prismaHealthCheck })) }
  }), { virtual: true });
  jest.doMock('../infrastructure/cache/redis.client', () => ({
    RedisClientManager: { getInstance: jest.fn(() => ({ healthCheck: redisHealthCheck })) }
  }), { virtual: true });
  jest.doMock('../infrastructure/messaging/kafka.client', () => ({
    KafkaClientManager: { getInstance: jest.fn(() => ({ connected: true })) }
  }), { virtual: true });

  if (options.repositoryImportError) {
    jest.doMock(
      '../infrastructure/database/repositories/courier.repository',
      () => {
        throw options.repositoryImportError;
      },
      { virtual: true }
    );
  } else {
    jest.doMock(
      '../infrastructure/database/repositories/courier.repository',
      () => ({ PrismaCourierRepository: class PrismaCourierRepository {} }),
      { virtual: true }
    );
  }

  jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.join(' '));
  });
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    logs.push(args.join(' '));
  });

  require('./infrastructure-validator');
  await flush();

  return {
    logs,
    dbGetInstance,
    redisGetInstance,
    kafkaGetInstance,
    envGetInstance,
    prismaHealthCheck,
    redisHealthCheck
  };
};

describe('infrastructure-validator script', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('runs full validation and logs successful summary', async () => {
    const { logs } = await runInfrastructureValidator();
    const output = logs.join(' ');

    expect(output).toContain('INFRASTRUCTURE VALIDATION SUITE');
    expect(output).toContain('Day 1: Configuration Layer - COMPLETED');
    expect(output).toContain('Day 2: Database Infrastructure - COMPLETED');
    expect(output).toContain('INFRASTRUCTURE STATUS: PERFECTLY FUNCTIONAL');
  });

  it('falls back gracefully when database health checks fail', async () => {
    const { logs } = await runInfrastructureValidator({
      prismaHealthError: new Error('db-unavailable')
    });
    const output = logs.join(' ');

    expect(output).toContain('Database connections not available');
    expect(output).toContain('Infrastructure components properly configured');
  });

  it('validates repository pattern when repository import succeeds', async () => {
    const { logs } = await runInfrastructureValidator();
    const output = logs.join(' ');

    expect(output).toContain('Courier Repository: Implemented');
    expect(output).toContain('Repository Pattern: Ready for database operations');
  });

  it('logs repository validation failure when repository import throws', async () => {
    const { logs } = await runInfrastructureValidator({
      repositoryImportError: new Error('repo-missing')
    });
    const output = logs.join(' ');

    expect(output).toContain('Repository validation failed:');
    expect(output).toContain('repo-missing');
  });

  it('loads configuration singletons and health checks exactly once per run', async () => {
    const {
      dbGetInstance,
      redisGetInstance,
      kafkaGetInstance,
      envGetInstance,
      prismaHealthCheck,
      redisHealthCheck
    } = await runInfrastructureValidator();

    expect(dbGetInstance).toHaveBeenCalledTimes(1);
    expect(redisGetInstance).toHaveBeenCalledTimes(1);
    expect(kafkaGetInstance).toHaveBeenCalledTimes(1);
    expect(envGetInstance).toHaveBeenCalledTimes(1);
    expect(prismaHealthCheck).toHaveBeenCalledTimes(1);
    expect(redisHealthCheck).toHaveBeenCalledTimes(1);
  });
});

export {};

