const prismaMock = {
  $queryRaw: jest.fn(),
  $disconnect: jest.fn().mockResolvedValue(undefined)
};

const createPrismaClient = jest.fn(() => prismaMock);

jest.mock('@shared/database/prisma-client', () => ({
  createPrismaClient: () => createPrismaClient()
}));

jest.mock('../services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('DatabaseConnection (logistics)', () => {
  let DatabaseConnection: typeof import('./prisma-client').DatabaseConnection;
  let prisma: typeof import('./prisma-client').prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    (globalThis as any).prisma = undefined;
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    ({ DatabaseConnection, prisma } = require('./prisma-client'));
  });

  it('creates a shared prisma client', () => {
    expect(prisma).toBe(prismaMock);
    expect(createPrismaClient).toHaveBeenCalledTimes(1);
  });

  it('reports healthy connection status when query succeeds', async () => {
    const status = await DatabaseConnection.getConnectionStatus();
    expect(status.connected).toBe(true);
    expect(status.responseTime).toMatch(/ms$/);
  });

  it('reports unhealthy connection status when query fails', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('query failed'));
    const status = await DatabaseConnection.getConnectionStatus();
    expect(status.connected).toBe(false);
    expect(status.error).toContain('query failed');
  });

  it('closes the prisma client', async () => {
    await DatabaseConnection.close();
    expect(prismaMock.$disconnect).toHaveBeenCalledTimes(1);
  });
});
