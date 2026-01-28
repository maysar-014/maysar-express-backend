import { Request, Response } from 'express';
import { healthRoutes } from '../health.routes';
import { DatabaseConnection } from '../../../infrastructure/database/prisma-client';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/database/prisma-client');
jest.mock('../../../infrastructure/services/logger.service');

describe('Health Routes', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      method: 'GET',
      path: '/health',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test/1.0')
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('GET /', () => {
    it('should return healthy status when all checks pass', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: true,
        responseTime: '5ms',
        connectionInfo: 'Connected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('healthy');
      expect(response.service).toBe('user-service');
      expect(response.checks.database.status).toBe('healthy');
    });

    it('should return degraded status when database is unhealthy', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: false,
        responseTime: 0,
        connectionInfo: 'Disconnected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('degraded');
      expect(response.checks.database.status).toBe('unhealthy');
    });

    it('should include memory metrics in response', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: true,
        responseTime: 5,
        connectionInfo: 'Connected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.checks.memory).toBeDefined();
      expect(response.checks.memory.status).toBe('healthy');
      expect(response.checks.memory.rss).toBeDefined();
      expect(response.checks.memory.heapUsed).toBeDefined();
    });

    it('should include system information in response', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: true,
        responseTime: 5,
        connectionInfo: 'Connected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.checks.system).toBeDefined();
      expect(response.checks.system.platform).toBeDefined();
      expect(response.checks.system.arch).toBeDefined();
      expect(response.checks.system.nodeVersion).toBeDefined();
    });

    it('should handle errors and return 503 status', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('unhealthy');
      expect(response.error).toBe('Health check failed');
    });

    it('should log health check completion', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: true,
        responseTime: 5,
        connectionInfo: 'Connected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(logger.info).toHaveBeenCalledWith(
        'Health check completed',
        expect.objectContaining({
          status: 'healthy',
          databaseStatus: 'healthy'
        })
      );
    });

    it('should include response time in health check', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: true,
        responseTime: 5,
        connectionInfo: 'Connected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.responseTime).toBeDefined();
      expect(response.responseTime).toMatch(/\d+ms/);
    });
  });

  describe('GET /ready', () => {
    it('should return ready status when database is connected', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: true,
        responseTime: 5,
        connectionInfo: 'Connected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/ready')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('ready');
      expect(response.checks.database.status).toBe('ready');
    });

    it('should return not ready status when database is disconnected', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockResolvedValue({
        connected: false,
        responseTime: 0,
        connectionInfo: 'Disconnected'
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/ready')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('not ready');
      expect(response.reason).toBe('Database not connected');
    });

    it('should handle errors in readiness check', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockRejectedValue(
        new Error('Connection check failed')
      );

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/ready')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('not ready');
      expect(response.error).toBe('Readiness check failed');
    });

    it('should log readiness check errors', async () => {
      (DatabaseConnection.getConnectionStatus as jest.Mock).mockRejectedValue(
        new Error('Connection check failed')
      );

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/ready')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(logger.error).toHaveBeenCalledWith(
        'Readiness check failed',
        expect.any(Object)
      );
    });
  });

  describe('GET /live', () => {
    it('should return alive status', async () => {
      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/live')?.route?.stack?.[0]?.handle;
      handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('alive');
      expect(response.service).toBe('user-service');
    });

    it('should include uptime in liveness response', async () => {
      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/live')?.route?.stack?.[0]?.handle;
      handler(mockReq, mockRes);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.uptime).toBeDefined();
      expect(response.uptime).toMatch(/\d+s/);
    });

    it('should include timestamp in liveness response', async () => {
      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/live')?.route?.stack?.[0]?.handle;
      handler(mockReq, mockRes);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /metrics', () => {
    it('should return metrics when database is available', async () => {
      (DatabaseConnection.getHealthMetrics as jest.Mock).mockResolvedValue({
        connections: 5,
        queries: 100
      });

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/metrics')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.service).toBe('user-service');
      expect(response.process).toBeDefined();
      expect(response.environment).toBeDefined();
      expect(response.database).toBeDefined();
    });

    it('should include process metrics', async () => {
      (DatabaseConnection.getHealthMetrics as jest.Mock).mockResolvedValue({});

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/metrics')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.process.pid).toBeDefined();
      expect(response.process.uptime).toBeDefined();
      expect(response.process.memory).toBeDefined();
      expect(response.process.cpu).toBeDefined();
    });

    it('should include environment information', async () => {
      (DatabaseConnection.getHealthMetrics as jest.Mock).mockResolvedValue({});

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/metrics')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.environment.nodeVersion).toBeDefined();
      expect(response.environment.platform).toBeDefined();
      expect(response.environment.arch).toBeDefined();
    });

    it('should handle metrics collection errors', async () => {
      (DatabaseConnection.getHealthMetrics as jest.Mock).mockRejectedValue(
        new Error('Metrics collection failed')
      );

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/metrics')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.status).toBe('error');
      expect(response.error).toBe('Failed to collect metrics');
    });

    it('should log metrics endpoint errors', async () => {
      (DatabaseConnection.getHealthMetrics as jest.Mock).mockRejectedValue(
        new Error('Metrics collection failed')
      );

      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/metrics')?.route?.stack?.[0]?.handle;
      await handler(mockReq, mockRes);

      expect(logger.error).toHaveBeenCalledWith(
        'Metrics endpoint failed',
        expect.any(Object)
      );
    });
  });

  describe('GET /ping', () => {
    it('should return pong response', async () => {
      const handler = (healthRoutes as any).stack.find((s: any) => s.route?.path === '/ping')?.route?.stack?.[0]?.handle;
      handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('pong');
    });
  });

  describe('Route Registration', () => {
    it('should register all health check endpoints', () => {
      const routes = (healthRoutes as any).stack
        .filter((s: any) => s.route)
        .map((s: any) => s.route.path);

      expect(routes).toContain('/');
      expect(routes).toContain('/ready');
      expect(routes).toContain('/live');
      expect(routes).toContain('/metrics');
      expect(routes).toContain('/ping');
    });
  });
});
