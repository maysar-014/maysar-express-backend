import type { Request, Response } from 'express';

const mockValidateToken = jest.fn();
const mockCheckTokenBlacklist = jest.fn();
const mockRecordFailure = jest.fn();
const mockGetDeviceHistory = jest.fn();
const mockHealthCheck = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../application/services/auth-middleware.service', () => ({
  AuthMiddlewareService: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
    checkTokenBlacklist: mockCheckTokenBlacklist,
    recordFailure: mockRecordFailure,
    getDeviceHistory: mockGetDeviceHistory,
    healthCheck: mockHealthCheck
  }))
}));

jest.mock('../../config/auth-middleware.config', () => ({
  AuthMiddlewareConfig: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    error: mockLoggerError,
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { AuthMiddlewareController } from './auth-middleware.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('AuthMiddlewareController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns token validation payload on success', async () => {
    const controller = new AuthMiddlewareController();
    const req = { body: { token: 'jwt-token' } } as Request;
    const res = createResponse();
    mockValidateToken.mockResolvedValue({ valid: true, userId: 'u1' });

    await controller.validateToken(req, res);

    expect(mockValidateToken).toHaveBeenCalledWith('jwt-token');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ valid: true })
      })
    );
  });

  it('maps service failures to standardized error response', async () => {
    const controller = new AuthMiddlewareController();
    const req = { body: { token: 'bad-token' } } as Request;
    const res = createResponse();
    mockCheckTokenBlacklist.mockRejectedValue(new Error('service unavailable'));

    await controller.checkTokenBlacklist(req, res);

    expect(mockLoggerError).toHaveBeenCalledWith('Token blacklist check error', expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'BLACKLIST_CHECK_ERROR' })
      })
    );
  });

  it('normalizes failure type and forwards payload to service', async () => {
    const controller = new AuthMiddlewareController();
    const req = {
      body: {
        identifier: 'user@example.com',
        type: 'unexpected',
        reason: 'invalid password',
        ipAddress: '127.0.0.1',
        userAgent: 'jest'
      }
    } as Request;
    const res = createResponse();
    mockRecordFailure.mockResolvedValue({ recorded: true });

    await controller.recordFailure(req, res);

    expect(mockRecordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'user@example.com',
        type: 'email'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('parses pagination query and retrieves device history', async () => {
    const controller = new AuthMiddlewareController();
    const req = {
      params: { userId: 'u1' },
      query: { limit: '5', offset: '2' }
    } as unknown as Request;
    const res = createResponse();
    mockGetDeviceHistory.mockResolvedValue({ devices: [], total: 0 });

    await controller.getDeviceHistory(req, res);

    expect(mockGetDeviceHistory).toHaveBeenCalledWith('u1', 5, 2);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('provides health check response', async () => {
    const controller = new AuthMiddlewareController();
    const req = {} as Request;
    const res = createResponse();
    mockHealthCheck.mockResolvedValue({ healthy: true });

    await controller.healthCheck(req, res);

    expect(mockHealthCheck).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ healthy: true })
      })
    );
  });
});
