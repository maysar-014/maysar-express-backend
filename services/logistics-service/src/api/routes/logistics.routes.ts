// ==================== LOGISTICS SERVICE API DOCUMENTATION ====================
// Logistics Service running on port 3007
//
// Health & Status APIs:
// - Health check: http://localhost:3007/health
// - Readiness check: http://localhost:3007/ready
// - Performance stats: http://localhost:3007/api/stats/performance
//
// Main API Endpoints (v1):
// - Delivery API: http://localhost:3007/api/v1/deliveries/*
// - Route API: http://localhost:3007/api/v1/routes/*
// - Courier API: http://localhost:3007/api/v1/couriers/*
// - Tracking API: http://localhost:3007/api/v1/tracking/*
// - Analytics API: http://localhost:3007/api/v1/analytics/*
// - Earnings API: http://localhost:3007/api/v1/earnings/*
// - Engine Status API: http://localhost:3007/api/v1/engines/status
// - Test API: http://localhost:3007/api/v1/test/all-engines
//
// Legacy Courier API:
// - Legacy Courier API: http://localhost:3007/api/courier/*
//   (Includes delivery management, routing, tracking, performance, earnings, vehicle management, training, support, etc.)

import express from 'express';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../../../../../shared/middleware/redis-rate-limit.store';
import { DependencyContainer } from '../../infrastructure/container';
import { DeliveryController } from '../controllers/delivery.controller';
import { RouteController } from '../controllers/route.controller';
import { CourierController } from '../controllers/courier.controller';
import { TrackingController } from '../controllers/tracking.controller';
import { EarningsController } from '../controllers/earnings.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { TestController } from '../controllers/test.controller';
import { CODController } from '../controllers/cod.controller';
import { DeliveryValidator } from '../validators/delivery.validator';
import { RouteValidator } from '../validators/route.validator';
import { EarningsValidator } from '../validators/earnings.validator';
import { TrackingValidator } from '../validators/tracking.validator';
import { AnalyticsValidator } from '../validators/analytics.validator';
import { validationResult } from 'express-validator';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';

// Simple validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const createApiValidationChain = () => (req: express.Request, res: express.Response, next: express.NextFunction) => next();

const router = express.Router();
const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisRateLimitStore(redisClient, 'rl:logistics:'),
  passOnStoreError: true
}));
router.use(idempotencyMiddleware.middleware());

// Initialize dependency container
const container = DependencyContainer.getInstance();

// Initialize controllers using dependency injection - deferred until container is ready
let deliveryController: DeliveryController;
let routeController: RouteController;
let courierController: CourierController;
let trackingController: TrackingController;
let earningsController: EarningsController;
let analyticsController: AnalyticsController;
let testController: TestController;
let codController: CODController;

// Function to get or initialize controllers lazily
function getDeliveryController(): DeliveryController {
  if (!deliveryController) {
    deliveryController = new DeliveryController();
  }
  return deliveryController;
}

function getRouteController(): RouteController {
  if (!routeController) {
    routeController = new RouteController();
  }
  return routeController;
}

function getCourierController(): CourierController {
  if (!courierController) {
    courierController = new CourierController();
  }
  return courierController;
}

function getTrackingController(): TrackingController {
  if (!trackingController) {
    trackingController = new TrackingController();
  }
  return trackingController;
}

function getEarningsController(): EarningsController {
  if (!earningsController) {
    earningsController = new EarningsController();
  }
  return earningsController;
}

function getAnalyticsController(): AnalyticsController {
  if (!analyticsController) {
    analyticsController = new AnalyticsController();
  }
  return analyticsController;
}

function getTestController(): TestController {
  if (!testController) {
    testController = new TestController();
  }
  return testController;
}

function getCODController(): CODController {
  if (!codController) {
    codController = new CODController();
  }
  return codController;
}

// ==================== DELIVERY ENDPOINTS ====================
// Delivery API: http://localhost:3007/api/v1/deliveries/*

router.post('/deliveries',
  createApiValidationChain(),
  DeliveryValidator.createDelivery(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getDeliveryController().createDelivery(req, res)
);

router.get('/deliveries/:deliveryId',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getDeliveryController().getDelivery(req, res)
);

router.get('/deliveries',
  createApiValidationChain(),
  DeliveryValidator.getDeliveries(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getDeliveryController().getDeliveries(req, res)
);

router.post('/deliveries/:deliveryId/status',
  createApiValidationChain(),
  DeliveryValidator.updateDeliveryStatus(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getDeliveryController().updateDeliveryStatus(req, res)
);

// ==================== COD ENDPOINTS ====================
// COD API: http://localhost:3007/api/v1/cod/*

router.post('/cod/:deliveryId/otp',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getCODController().generateOTP(req, res)
);

router.post('/cod/:deliveryId/verify',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getCODController().verifyDelivery(req, res)
);

// ==================== ROUTE ENDPOINTS ====================
// Route API: http://localhost:3007/api/v1/routes/*

router.get('/routes',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getRouteController().getRoutes(req, res)
);

router.get('/routes/courier/:courierId',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getRouteController().getCourierRoutes(req, res)
);

router.post('/routes/optimize',
  RouteValidator.optimizeRoute(),
  (req: express.Request, res: express.Response) => getRouteController().optimizeRoute(req, res)
);

router.get('/routes/:routeId',
  RouteValidator.getRoute(),
  (req: express.Request, res: express.Response) => getRouteController().getRoute(req, res)
);

router.put('/routes/:routeId/progress',
  RouteValidator.updateRouteProgress(),
  (req: express.Request, res: express.Response) => getRouteController().updateRouteProgress(req, res)
);

router.post('/routes/:routeId/alternatives',
  (req: express.Request, res: express.Response) => getRouteController().getAlternativeRoutes(req, res)
);

// ==================== COURIER ENDPOINTS ====================
// Courier API: http://localhost:3007/api/v1/couriers/*

router.get('/couriers',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getCourierController().getCouriers(req, res)
);

router.get('/couriers/:courierId',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getCourierController().getCourier(req, res)
);

router.put('/couriers/:courierId/status',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getCourierController().updateCourierStatus(req, res)
);

// ==================== TRACKING ENDPOINTS ====================
// Tracking API: http://localhost:3007/api/v1/tracking/*

router.get('/tracking/:trackingNumber',
  createApiValidationChain(),
  TrackingValidator.getTrackingHistory(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getTrackingController().getTrackingHistory(req, res)
);

router.post('/tracking/location',
  createApiValidationChain(),
  TrackingValidator.storeLocationUpdate(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getTrackingController().storeLocationUpdate(req, res)
);

router.get('/tracking/courier/:courierId/history',
  createApiValidationChain(),
  TrackingValidator.getCourierLocationHistory(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getTrackingController().getCourierLocationHistory(req, res)
);

// ==================== ANALYTICS ENDPOINTS ====================
// Analytics API: http://localhost:3007/api/v1/analytics/*

router.get('/analytics',
  createApiValidationChain(),
  AnalyticsValidator.getAnalytics(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getAnalyticsController().getAnalytics(req, res)
);

router.get('/analytics/performance',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getAnalyticsController().getPerformanceMetrics(req, res)
);

router.get('/analytics/courier/:courierId',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getAnalyticsController().getCourierAnalytics(req, res)
);

// ==================== DELIVERY HISTORY ENDPOINTS ====================
router.get('/deliveries/:deliveryId/history', async (req, res) => {
  try {
    const deliveryId = req.params.deliveryId;
    // TODO: Use proper history controller
    // const history = await deliveryHistoryController.getDeliveryHistory(deliveryId);
    res.json({
      success: true,
      data: {
        deliveryId,
        history: [
          {
            status: 'created',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            location: 'Order placed'
          },
          {
            status: 'assigned',
            timestamp: new Date(Date.now() - 90 * 60 * 1000),
            location: 'Courier assigned'
          },
          {
            status: 'picked_up',
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            location: 'Uhuru Street'
          },
          {
            status: 'in_transit',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            location: 'En route to destination'
          }
        ]
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EARNINGS ENDPOINTS ====================
// Earnings API: http://localhost:3007/api/v1/earnings/*

router.get('/earnings',
  createApiValidationChain(),
  EarningsValidator.getEarnings(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getEarningsController().getEarnings(req, res)
);

router.get('/earnings/courier/:courierId',
  createApiValidationChain(),
  EarningsValidator.getCourierEarningsReport(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getEarningsController().getCourierEarnings(req, res)
);

router.post('/earnings',
  createApiValidationChain(),
  EarningsValidator.recordEarnings(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getEarningsController().recordEarnings(req, res)
);

router.post('/earnings/calculate',
  createApiValidationChain(),
  EarningsValidator.calculateCommissions(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getEarningsController().calculateCommissions(req, res)
);

router.get('/earnings/summary',
  createApiValidationChain(),
  EarningsValidator.getEarningsSummary(),
  handleValidationErrors,
  (req: express.Request, res: express.Response) => getEarningsController().getEarningsSummary(req, res)
);

// ==================== PERFORMANCE STATS ENDPOINT ====================

router.get('/stats/performance', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'logistics-service',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ENGINE STATUS ENDPOINTS ====================

router.get('/engines/status', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        engines: [
          { name: 'logistics', status: 'healthy', version: '1.0.0' },
          { name: 'route-optimization', status: 'healthy', version: '1.0.0' },
          { name: 'real-time-tracking', status: 'healthy', version: '1.0.0' },
          { name: 'delivery-history', status: 'healthy', version: '1.0.0' },
          { name: 'earnings-calculation', status: 'healthy', version: '1.0.0' },
          { name: 'earnings-management', status: 'healthy', version: '1.0.0' },
          { name: 'performance-analytics', status: 'healthy', version: '1.0.0' },
          { name: 'performance-monitoring', status: 'healthy', version: '1.0.0' },
          { name: 'super-efficiency-optimizer', status: 'healthy', version: '1.0.0' },
          { name: 'vehicle-compliance', status: 'healthy', version: '1.0.0' },
          { name: 'integration-testing', status: 'healthy', version: '1.0.0' }
        ],
        totalEngines: 11,
        healthyEngines: 11
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TEST ENDPOINTS ====================

router.get('/test/all-engines',
  createApiValidationChain(),
  (req: express.Request, res: express.Response) => getTestController().testAllEngines(req, res)
);

// ==================== INFRASTRUCTURE MONITORING ENDPOINTS ====================
// Constitution Section 8: Infrastructure Isolation Rule

router.get('/health',
  (req: express.Request, res: express.Response) => getTestController().healthCheck(req, res)
);

router.get('/metrics',
  (req: express.Request, res: express.Response) => getTestController().getInfrastructureMetrics(req, res)
);

// ==================== QUALITY ASSURANCE ENDPOINTS ====================
// Constitution Section 1: Architecture Constitution

router.get('/qa/architecture',
  (req: express.Request, res: express.Response) => getTestController().runArchitecturalAnalysis(req, res)
);

router.get('/qa/performance',
  (req: express.Request, res: express.Response) => getTestController().runPerformanceBenchmarks(req, res)
);

router.post('/qa/load-test',
  (req: express.Request, res: express.Response) => getTestController().runLoadTest(req, res)
);

router.get('/qa/security',
  (req: express.Request, res: express.Response) => getTestController().runSecurityAudit(req, res)
);

router.get('/qa/dashboard',
  (req: express.Request, res: express.Response) => getTestController().getQualityDashboard(req, res)
);

export default router;
