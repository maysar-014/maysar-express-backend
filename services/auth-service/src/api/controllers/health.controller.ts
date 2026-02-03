import { Request, Response } from 'express';
import { serviceDiscovery, getServiceDiscoveryHealth } from '../../infrastructure/services/service-discovery';
import { logger } from '../../infrastructure/services/logger.service';
import { UserServiceClient } from '../../infrastructure/clients/user-service.client';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

/**
 * Health Controller
 * Provides health check endpoints for monitoring and load balancer probes
 */
export class HealthController {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Basic health check
   */
  async basicHealth(req: Request, res: Response): Promise<void> {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json({
      success: true,
      data: health
    });
  }

  /**
   * Detailed health check with component status
   */
  async detailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const health: HealthStatus & {
        components: {
          serviceDiscovery: any;
          userService: boolean;
          database: boolean;
          cache: boolean;
        };
      } = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        components: {
          serviceDiscovery: getServiceDiscoveryHealth(),
          userService: false,
          database: false,
          cache: false
        }
      };

      // Check User Service connectivity
      try {
        const userServiceClient = serviceDiscovery.getUserServiceClient();
        if (userServiceClient) {
          health.components.userService = await userServiceClient.healthCheck();
        }
      } catch (error) {
        logger.warn('User Service health check failed', { error });
      }

      // Check database connectivity (placeholder)
      try {
        // TODO: Implement actual database health check
        health.components.database = true;
      } catch (error) {
        health.components.database = false;
        health.status = 'degraded';
      }

      // Check cache connectivity (placeholder)
      try {
        // TODO: Implement actual cache health check
        health.components.cache = true;
      } catch (error) {
        health.components.cache = false;
        health.status = 'degraded';
      }

      // Determine overall status
      if (!health.components.userService) {
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });

    } catch (error) {
      logger.error('Detailed health check failed', { error });
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  /**
   * Readiness probe - checks if service is ready to accept traffic
   */
  async readiness(req: Request, res: Response): Promise<void> {
    try {
      // Check if User Service is available
      const userServiceClient = serviceDiscovery.getUserServiceClient();
      const userServiceHealthy = userServiceClient ? await userServiceClient.healthCheck() : false;

      if (!userServiceHealthy) {
        logger.warn('Readiness check failed: User Service unavailable');
        res.status(503).json({
          success: false,
          message: 'Service not ready: User Service unavailable'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Service is ready to accept traffic',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        success: false,
        message: 'Service not ready'
      });
    }
  }

  /**
   * Liveness probe - checks if service is running
   */
  async liveness(req: Request, res: Response): Promise<void> {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({
      success: true,
      message: 'Service is alive',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Service discovery health status
   */
  async serviceDiscovery(req: Request, res: Response): Promise<void> {
    try {
      const discoveryHealth = getServiceDiscoveryHealth();

      res.status(200).json({
        success: true,
        data: discoveryHealth
      });

    } catch (error) {
      logger.error('Service discovery health check failed', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get service discovery health'
      });
    }
  }

  /**
   * Circuit breaker status
   */
  async circuitBreakerStatus(req: Request, res: Response): Promise<void> {
    try {
      const userServiceClient = serviceDiscovery.getUserServiceClient();
      const circuitBreakerStats = userServiceClient?.getCircuitBreakerStats();

      res.status(200).json({
        success: true,
        data: {
          userService: circuitBreakerStats
        }
      });

    } catch (error) {
      logger.error('Circuit breaker status check failed', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get circuit breaker status'
      });
    }
  }

  /**
   * Basic metrics endpoint
   */
  async metrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        serviceDiscovery: getServiceDiscoveryHealth(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      };

      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Metrics collection failed', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to collect metrics'
      });
    }
  }
}

// Create singleton instance
export const healthController = new HealthController();
