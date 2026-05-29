const mockQueryRaw = jest.fn();
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockPrismaCtor = jest.fn().mockImplementation(function (this: any) {
  this.$queryRaw = mockQueryRaw;
  this.$disconnect = mockDisconnect;
});

jest.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaCtor
}));

const mockConfig = {
  database: {
    url: 'postgresql://localhost:5432/auth_test',
    prisma: {
      log: [],
      errorFormat: 'colorless'
    }
  }
};

jest.mock('../../config', () => ({
  config: mockConfig
}));

describe('auth prisma client', () => {
  const originalEnv = { ...process.env };
  const originalOn = process.on;
  const processOnMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.on = processOnMock as never;
    delete process.env.PGSSLMODE;
    mockQueryRaw.mockReset();
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
  });

  afterEach(() => {
    process.on = originalOn;
    process.env = originalEnv;
  });

  it('normalizes localhost urls and enables ssl disable once', async () => {
    const { prisma } = await import('./prisma-client');

    expect(mockPrismaCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        datasources: {
          db: {
            url: expect.stringContaining('sslmode=disable')
          }
        }
      })
    );
    expect(process.env.PGSSLMODE).toBe('disable');
    expect(processOnMock).toHaveBeenCalledWith('beforeExit', expect.any(Function));
    expect(processOnMock).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(processOnMock).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(prisma).toBeDefined();
  });

  it('reports health and connection info from live query results', async () => {
    const module = await import('./prisma-client');
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockQueryRaw.mockResolvedValueOnce([{ count: 4 }]);

    await expect(module.prisma.healthCheck()).resolves.toEqual(
      expect.objectContaining({
        status: 'healthy',
        latency: expect.any(Number),
        timestamp: expect.any(Date)
      })
    );

    await expect(module.prisma.getConnectionInfo()).resolves.toEqual({
      activeConnections: 4,
      idleConnections: 0,
      totalConnections: 4
    });
  });

  it('falls back cleanly when health and connection queries fail', async () => {
    const module = await import('./prisma-client');
    mockQueryRaw.mockRejectedValueOnce(new Error('unavailable')).mockRejectedValueOnce(new Error('unavailable'));

    await expect(module.prisma.healthCheck()).resolves.toEqual(
      expect.objectContaining({
        status: 'unhealthy',
        latency: expect.any(Number),
        timestamp: expect.any(Date)
      })
    );

    await expect(module.prisma.getConnectionInfo()).resolves.toEqual({
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0
    });
  });
});
