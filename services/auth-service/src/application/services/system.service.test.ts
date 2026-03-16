const mockLoggerError = jest.fn();
const prismaUserCountMock = jest.fn();
const prismaSessionCountMock = jest.fn();
const prismaTransactionMock = jest.fn();
const serviceDiscoveryMock = {
  getAllServices: jest.fn()
};

jest.mock('../../infrastructure/database/prisma-client', () => ({
  prisma: {
    user: { count: prismaUserCountMock },
    session: { count: prismaSessionCountMock },
    $transaction: prismaTransactionMock
  }
}));

jest.mock('../../infrastructure/services/service-discovery.service', () => ({
  serviceDiscovery: serviceDiscoveryMock
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { SystemService, systemService } from './system.service';

describe('SystemService', () => {
  let service: SystemService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SystemService();
    prismaTransactionMock.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg({
        user: { count: prismaUserCountMock },
        session: { count: prismaSessionCountMock }
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns system statistics with expected shape', async () => {
    prismaUserCountMock.mockResolvedValueOnce(42);
    prismaSessionCountMock.mockResolvedValueOnce(7);
    const stats = await service.getSystemStats();

    expect(stats).toEqual(
      expect.objectContaining({
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          usedBytes: expect.any(Number),
          totalBytes: expect.any(Number),
          usedPercent: expect.any(Number)
        }),
        cpu: expect.objectContaining({
          loadAverage: expect.any(Number),
          cores: expect.any(Number)
        }),
        activeUsers: 42,
        activeSessions: 7,
        requestsPerSecond: 0,
        timestamp: expect.any(String)
      })
    );
  });

  it('returns service health overview payload', async () => {
    serviceDiscoveryMock.getAllServices.mockReturnValueOnce([
      {
        name: 'auth-service',
        url: 'http://auth:3000',
        health: true,
        lastCheck: new Date('2026-03-10T00:00:00.000Z'),
        responseTimeMs: 12
      }
    ]);
    const health = await service.getServiceHealth();

    expect(health.overallStatus).toBe('healthy');
    expect(health.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'auth-service', status: 'healthy' })
      ])
    );
    expect(health.timestamp).toEqual(expect.any(String));
  });

  it('exports singleton service instance', () => {
    expect(systemService).toBeInstanceOf(SystemService);
  });
});
