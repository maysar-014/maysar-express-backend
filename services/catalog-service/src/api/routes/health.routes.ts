/**
 * Health Routes
 * RESTful route definitions for health monitoring operations
 * Implements API versioning and health check endpoints
 */

import { Router } from 'express';

/**
 * Health Routes Configuration
 */
export interface HealthRoutesConfig {
  apiVersion: string;
  enableDetailedHealth: boolean;
  healthCheckInterval: number;
}

/**
 * Default Health Routes Configuration
 */
export const DEFAULT_HEALTH_ROUTES_CONFIG: HealthRoutesConfig = {
  apiVersion: 'v1',
  enableDetailedHealth: true,
  healthCheckInterval: 30000 // 30 seconds
};

/**
 * Create Health Routes
 * Factory function for creating health check route handlers
 */
export function createHealthRoutes(
  config: Partial<HealthRoutesConfig> = {}
): Router {
  const router = Router();
  const routesConfig = { ...DEFAULT_HEALTH_ROUTES_CONFIG, ...config };
  const apiPrefix = `/api/${routesConfig.apiVersion}`;

  // =====================================================================================
  // BASIC HEALTH CHECKS
  // =====================================================================================

  /**
   * Basic Health Check
   * GET /api/v1/health
   */
  router.get(`${apiPrefix}/health`,
    async (req, res) => {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        service: 'catalog-service'
      };

      res.status(200).json(healthStatus);
    }
  );

  /**
   * Readiness Probe
   * GET /api/v1/health/ready
   */
  router.get(`${apiPrefix}/health/ready`,
    async (req, res) => {
      // Check if service is ready to accept traffic
      const isReady = await checkServiceReadiness();

      const readinessStatus = {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: isReady,
          cache: isReady,
          messageBus: isReady
        }
      };

      res.status(isReady ? 200 : 503).json(readinessStatus);
    }
  );

  /**
   * Liveness Probe
   * GET /api/v1/health/live
   */
  router.get(`${apiPrefix}/health/live`,
    async (req, res) => {
      // Basic liveness check - if we can respond, we're alive
      const livenessStatus = {
        status: 'alive',
        timestamp: new Date().toISOString(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      };

      res.status(200).json(livenessStatus);
    }
  );

  // =====================================================================================
  // DETAILED HEALTH CHECKS
  // =====================================================================================

  /**
   * Detailed Health Check
   * GET /api/v1/health/detailed
   */
  router.get(`${apiPrefix}/health/detailed`,
    async (req, res) => {
      if (!routesConfig.enableDetailedHealth) {
        return res.status(403).json({
          status: 'forbidden',
          message: 'Detailed health checks are disabled'
        });
      }

      const detailedHealth = await getDetailedHealthStatus();

      const statusCode = detailedHealth.overall === 'healthy' ? 200 :
                        detailedHealth.overall === 'degraded' ? 200 : 503;

      res.status(statusCode).json(detailedHealth);
    }
  );

  /**
   * Health Check for Load Balancer
   * GET /health
   */
  router.get('/health',
    async (req, res) => {
      // Simple health check for load balancers
      res.status(200).send('OK');
    }
  );

  /**
   * Ping Endpoint
   * GET /api/v1/ping
   */
  router.get(`${apiPrefix}/ping`,
    async (req, res) => {
      res.status(200).json({
        pong: true,
        timestamp: new Date().toISOString(),
        service: 'catalog-service'
      });
    }
  );

  /**
   * Service Info
   * GET /api/v1/info
   */
  router.get(`${apiPrefix}/info`,
    async (req, res) => {
      const serviceInfo = {
        service: 'catalog-service',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /api/v1/health',
          'GET /api/v1/health/ready',
          'GET /api/v1/health/live',
          'GET /api/v1/health/detailed',
          'GET /api/v1/ping',
          'GET /api/v1/info'
        ]
      };

      res.status(200).json(serviceInfo);
    }
  );

  return router;
}

/**
 * Health Routes Factory
 */
export class HealthRoutesFactory {
  static create(config: Partial<HealthRoutesConfig> = {}): Router {
    return createHealthRoutes(config);
  }
}

/**
 * Health Check Helper Functions
 */
async function checkServiceReadiness(): Promise<boolean> {
  // In a real implementation, this would check:
  // - Database connectivity
  // - Cache connectivity
  // - Message bus connectivity
  // - External service dependencies

  // For now, simulate a basic readiness check
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate 95% uptime
      resolve(Math.random() > 0.05);
    }, 10);
  });
}

async function getDetailedHealthStatus() {
  const timestamp = new Date().toISOString();

  // Mock detailed health checks
  const checks = {
    database: {
      status: 'healthy',
      latency: Math.floor(Math.random() * 50) + 10,
      connections: {
        active: 5,
        idle: 10,
        total: 15
      }
    },
    cache: {
      status: 'healthy',
      hitRate: 0.85,
      memoryUsage: {
        used: 45,
        total: 100,
        unit: 'MB'
      }
    },
    messageBus: {
      status: 'healthy',
      connections: 3,
      pendingMessages: 0
    },
    search: {
      status: 'healthy',
      indexSize: 125000,
      queryLatency: Math.floor(Math.random() * 30) + 5
    },
    externalServices: {
      status: 'healthy',
      services: {
        cdn: 'healthy',
        payment: 'healthy',
        notification: 'healthy'
      }
    }
  };

  // Calculate overall status
  const unhealthyChecks = Object.values(checks).filter(
    (check: any) => check.status !== 'healthy'
  );

  const overall = unhealthyChecks.length === 0 ? 'healthy' :
                 unhealthyChecks.length < 2 ? 'degraded' : 'unhealthy';

  return {
    overall,
    timestamp,
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    checks,
    summary: {
      totalChecks: Object.keys(checks).length,
      healthy: Object.values(checks).filter((c: any) => c.status === 'healthy').length,
      degraded: Object.values(checks).filter((c: any) => c.status === 'degraded').length,
      unhealthy: unhealthyChecks.length
    }
  };
}

/**
 * Route Metadata
 */
export const HEALTH_ROUTES_METADATA = {
  version: 'v1',
  prefix: '/api/v1',
  routes: [
    { method: 'GET', path: '/health', description: 'Basic health check', auth: 'none' },
    { method: 'GET', path: '/health/ready', description: 'Readiness probe', auth: 'none' },
    { method: 'GET', path: '/health/live', description: 'Liveness probe', auth: 'none' },
    { method: 'GET', path: '/health/detailed', description: 'Detailed health check', auth: 'none' },
    { method: 'GET', path: '/health', description: 'Load balancer health check (no prefix)', auth: 'none' },
    { method: 'GET', path: '/ping', description: 'Simple ping endpoint', auth: 'none' },
    { method: 'GET', path: '/info', description: 'Service information', auth: 'none' }
  ],
  middleware: [],
  healthChecks: [
    'basic_health',
    'readiness_probe',
    'liveness_probe',
    'detailed_health',
    'service_info'
  ]
};
