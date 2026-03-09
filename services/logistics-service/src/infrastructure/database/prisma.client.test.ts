const mockCreatePrismaClient = jest.fn();

jest.mock('../../config/database.config', () => ({
  DatabaseConfiguration: {
    getInstance: () => ({
      createPrismaClient: mockCreatePrismaClient
    })
  }
}));

import { PrismaClientManager } from './prisma.client';

describe('PrismaClientManager', () => {
  const prisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }])
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePrismaClient.mockReturnValue(prisma);
    delete (PrismaClientManager as any).instance;
  });

  afterAll(() => {
    delete (PrismaClientManager as any).instance;
  });

  it('throws when getClient is called before initialization', () => {
    const manager = PrismaClientManager.getInstance();
    expect(() => manager.getClient()).toThrow('Prisma client not initialized');
  });

  it('connects lazily via getClientAsync and reports health', async () => {
    const manager = PrismaClientManager.getInstance();

    const client = await manager.getClientAsync();
    const health = await manager.healthCheck();

    expect(client).toBe(prisma);
    expect(prisma.$connect).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(manager.isHealthy()).toBe(true);
    expect(health.status).toBe('healthy');
  });

  it('reuses connection and supports disconnect/reconnect', async () => {
    const manager = PrismaClientManager.getInstance();

    await manager.connect();
    await manager.connect();
    await manager.disconnect();
    await manager.connect();

    expect(prisma.$connect).toHaveBeenCalledTimes(2);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('returns unhealthy health check when query fails', async () => {
    const manager = PrismaClientManager.getInstance();
    await manager.connect();
    prisma.$queryRaw.mockRejectedValueOnce(new Error('query failed'));

    const health = await manager.healthCheck();

    expect(health.status).toBe('unhealthy');
  });
});
