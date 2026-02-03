import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';

const router = Router();

/**
 * Health Check Routes
 * These endpoints are used for service monitoring and load balancer health checks
 */

// Basic health check
router.get('/', asyncHandler(healthController.basicHealth.bind(healthController)));

// Detailed health check
router.get('/detailed', asyncHandler(healthController.detailedHealth.bind(healthController)));

// Readiness probe
router.get('/ready', asyncHandler(healthController.readiness.bind(healthController)));

// Liveness probe
router.get('/live', asyncHandler(healthController.liveness.bind(healthController)));

// Service discovery health
router.get('/discovery', asyncHandler(healthController.serviceDiscovery.bind(healthController)));

// Circuit breaker status
router.get('/circuit-breaker', asyncHandler(healthController.circuitBreakerStatus.bind(healthController)));

// Metrics endpoint (basic)
router.get('/metrics', asyncHandler(healthController.metrics.bind(healthController)));

export { router as healthRoutes };
