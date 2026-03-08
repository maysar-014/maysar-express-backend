const mockGetUserServiceClient = jest.fn();
const mockGetServiceDiscoveryHealth = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../infrastructure/services/service-discovery', () => ({
  serviceDiscovery: {
    getUserServiceClient: mockGetUserServiceClient
  },
  getServiceDiscoveryHealth: () => mockGetServiceDiscoveryHealth()
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    warn: mockLoggerWarn,
    error: mockLoggerError,
    info: jest.fn(),
    debug: jest.fn()
  }
}));

import type { Request, Response } from 'express';
import { HealthController as AuthHealthController } from './health.controller';
import { HealthController as TrainingHealthController } from '../../../../training-service/src/api/controllers/health.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('health controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServiceDiscoveryHealth.mockReturnValue({ userService: { healthyInstances: 1 } });
  });

  it('returns basic health payload for auth-service controller', async () => {
    const controller = new AuthHealthController();
    const req = {} as Request;
    const res = createResponse();

    await controller.basicHealth(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: 'healthy' })
      })
    );
  });

  it('returns detailed health with healthy status when dependencies are available', async () => {
    const controller = new AuthHealthController();
    const req = {} as Request;
    const res = createResponse();
    mockGetUserServiceClient.mockReturnValue({
      healthCheck: jest.fn().mockResolvedValue(true)
    });

    await controller.detailedHealth(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          status: 'healthy',
          components: expect.objectContaining({
            userService: true,
            database: true,
            cache: true
          })
        })
      })
    );
  });

  it('returns degraded status when user service health fails', async () => {
    const controller = new AuthHealthController();
    const req = {} as Request;
    const res = createResponse();
    mockGetUserServiceClient.mockReturnValue({
      healthCheck: jest.fn().mockResolvedValue(false)
    });

    await controller.detailedHealth(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: expect.objectContaining({ status: 'degraded' })
      })
    );
  });

  it('handles readiness, liveness, and discovery endpoints', async () => {
    const controller = new AuthHealthController();
    const req = {} as Request;
    const res = createResponse();

    mockGetUserServiceClient.mockReturnValue({
      healthCheck: jest.fn().mockResolvedValue(true),
      getCircuitBreakerStats: jest.fn().mockReturnValue({ state: 'closed' })
    });

    await controller.readiness(req, res);
    await controller.liveness(req, res);
    await controller.serviceDiscovery(req, res);
    await controller.circuitBreakerStatus(req, res);
    await controller.metrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true
      })
    );
  });

  it('returns error response when detailed health setup throws', async () => {
    const controller = new AuthHealthController();
    const req = {} as Request;
    const res = createResponse();
    mockGetServiceDiscoveryHealth.mockImplementationOnce(() => {
      throw new Error('discovery failure');
    });

    await controller.detailedHealth(req, res);

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Detailed health check failed',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Health check failed',
        error: 'discovery failure'
      })
    );
  });

  it('returns basic UP status in training-service health controller', async () => {
    const controller = new TrainingHealthController();
    const req = {} as Request;
    const res = createResponse();

    await controller.check(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'UP'
      })
    );
  });
});
