const mockLoggerError = jest.fn();

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns system statistics with expected shape', async () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.9);

    const stats = await service.getSystemStats();
    randomSpy.mockRestore();

    expect(stats).toEqual(
      expect.objectContaining({
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          used: expect.any(String),
          total: '1GB'
        }),
        cpu: expect.objectContaining({
          usage: expect.any(String)
        }),
        activeUsers: expect.any(Number),
        activeSessions: expect.any(Number),
        requestsPerSecond: expect.any(Number),
        timestamp: expect.any(String)
      })
    );
  });

  it('returns service health overview payload', async () => {
    const health = await service.getServiceHealth();

    expect(health.overallStatus).toBe('healthy');
    expect(health.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'auth-service', status: 'healthy' }),
        expect.objectContaining({ name: 'user-service', status: 'healthy' }),
        expect.objectContaining({ name: 'database', status: 'healthy' })
      ])
    );
    expect(health.timestamp).toEqual(expect.any(String));
  });

  it('exports singleton service instance', () => {
    expect(systemService).toBeInstanceOf(SystemService);
  });
});
