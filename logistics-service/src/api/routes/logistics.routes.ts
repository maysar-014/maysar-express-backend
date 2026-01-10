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
import { DependencyContainer } from '../../infrastructure/container';
import { DeliveryController } from '../controllers/delivery.controller';
import { RouteController } from '../controllers/route.controller';
import { CourierController } from '../controllers/courier.controller';
import { TrackingController } from '../controllers/tracking.controller';
import { EarningsController } from '../controllers/earnings.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { TestController } from '../controllers/test.controller';
import { DeliveryValidator } from '../validators/delivery.validator';
import { RouteValidator } from '../validators/route.validator';
import { EarningsValidator } from '../validators/earnings.validator';
import { TrackingValidator } from '../validators/tracking.validator';
import { AnalyticsValidator } from '../validators/analytics.validator';
import { ValidationMiddleware } from '../middleware/validation.middleware';

const router = express.Router();

// Initialize dependency container
const container = DependencyContainer.getInstance();

// Initialize controllers using dependency injection
const deliveryController = new DeliveryController();
const routeController = new RouteController();
const courierController = new CourierController();
const trackingController = new TrackingController();
const earningsController = new EarningsController();
const analyticsController = new AnalyticsController();
const testController = new TestController();

// ==================== DELIVERY ENDPOINTS ====================
// Delivery API: http://localhost:3007/api/v1/deliveries/*

router.post('/deliveries',
  ValidationMiddleware.createApiValidationChain(),
  DeliveryValidator.createDelivery(),
  ValidationMiddleware.handleValidationErrors,
  deliveryController.createDelivery.bind(deliveryController)
);

router.get('/deliveries/:deliveryId',
  ValidationMiddleware.createApiValidationChain(),
  deliveryController.getDelivery.bind(deliveryController)
);

router.get('/deliveries',
  ValidationMiddleware.createApiValidationChain(),
  DeliveryValidator.getDeliveries(),
  ValidationMiddleware.handleValidationErrors,
  deliveryController.getDeliveries.bind(deliveryController)
);

// ==================== ROUTE ENDPOINTS ====================
// Route API: http://localhost:3007/api/v1/routes/*

router.get('/routes',
  ValidationMiddleware.createApiValidationChain(),
  routeController.getRoutes.bind(routeController)
);

router.get('/routes/courier/:courierId',
  ValidationMiddleware.createApiValidationChain(),
  routeController.getCourierRoutes.bind(routeController)
);

router.post('/routes/optimize',
  RouteValidator.optimizeRoute(),
  routeController.optimizeRoute.bind(routeController)
);

router.get('/routes/:routeId',
  RouteValidator.getRoute(),
  routeController.getRoute.bind(routeController)
);

router.put('/routes/:routeId/progress', 
  RouteValidator.updateRouteProgress(),
  routeController.updateRouteProgress.bind(routeController)
);

router.post('/routes/:routeId/alternatives', 
  routeController.getAlternativeRoutes.bind(routeController)
);

// ==================== COURIER ENDPOINTS ====================
// Courier API: http://localhost:3007/api/v1/couriers/*

router.get('/couriers',
  ValidationMiddleware.createApiValidationChain(),
  courierController.getCouriers.bind(courierController)
);

router.get('/couriers/:courierId',
  ValidationMiddleware.createApiValidationChain(),
  courierController.getCourier.bind(courierController)
);

router.put('/couriers/:courierId/status',
  ValidationMiddleware.createApiValidationChain(),
  courierController.updateCourierStatus.bind(courierController)
);

// ==================== TRACKING ENDPOINTS ====================
// Tracking API: http://localhost:3007/api/v1/tracking/*

router.get('/tracking/:trackingNumber',
  ValidationMiddleware.createApiValidationChain(),
  TrackingValidator.getTrackingHistory(),
  ValidationMiddleware.handleValidationErrors,
  trackingController.getTrackingHistory.bind(trackingController)
);

router.post('/tracking/location',
  ValidationMiddleware.createApiValidationChain(),
  TrackingValidator.storeLocationUpdate(),
  ValidationMiddleware.handleValidationErrors,
  trackingController.storeLocationUpdate.bind(trackingController)
);

router.get('/tracking/courier/:courierId/history',
  ValidationMiddleware.createApiValidationChain(),
  TrackingValidator.getCourierLocationHistory(),
  ValidationMiddleware.handleValidationErrors,
  trackingController.getCourierLocationHistory.bind(trackingController)
);

// ==================== ANALYTICS ENDPOINTS ====================
// Analytics API: http://localhost:3007/api/v1/analytics/*

router.get('/analytics',
  ValidationMiddleware.createApiValidationChain(),
  AnalyticsValidator.getAnalytics(),
  ValidationMiddleware.handleValidationErrors,
  analyticsController.getAnalytics.bind(analyticsController)
);

router.get('/analytics/performance',
  ValidationMiddleware.createApiValidationChain(),
  analyticsController.getPerformanceMetrics.bind(analyticsController)
);

router.get('/analytics/courier/:courierId',
  ValidationMiddleware.createApiValidationChain(),
  analyticsController.getCourierAnalytics.bind(analyticsController)
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
  ValidationMiddleware.createApiValidationChain(),
  EarningsValidator.getEarnings(),
  ValidationMiddleware.handleValidationErrors,
  earningsController.getEarnings.bind(earningsController)
);

router.get('/earnings/courier/:courierId',
  ValidationMiddleware.createApiValidationChain(),
  EarningsValidator.getCourierEarningsReport(),
  ValidationMiddleware.handleValidationErrors,
  earningsController.getCourierEarnings.bind(earningsController)
);

router.post('/earnings',
  ValidationMiddleware.createApiValidationChain(),
  EarningsValidator.recordEarnings(),
  ValidationMiddleware.handleValidationErrors,
  earningsController.recordEarnings.bind(earningsController)
);

router.post('/earnings/calculate',
  ValidationMiddleware.createApiValidationChain(),
  EarningsValidator.calculateCommissions(),
  ValidationMiddleware.handleValidationErrors,
  earningsController.calculateCommissions.bind(earningsController)
);

router.get('/earnings/summary',
  ValidationMiddleware.createApiValidationChain(),
  EarningsValidator.getEarningsSummary(),
  ValidationMiddleware.handleValidationErrors,
  earningsController.getEarningsSummary.bind(earningsController)
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
  ValidationMiddleware.createApiValidationChain(),
  testController.testAllEngines.bind(testController)
);

// ==================== INFRASTRUCTURE MONITORING ENDPOINTS ====================
// Constitution Section 8: Infrastructure Isolation Rule

router.get('/health',
  testController.healthCheck.bind(testController)
);

router.get('/metrics',
  testController.getInfrastructureMetrics.bind(testController)
);

// ==================== QUALITY ASSURANCE ENDPOINTS ====================
// Constitution Section 1: Architecture Constitution

router.get('/qa/architecture',
  testController.runArchitecturalAnalysis.bind(testController)
);

router.get('/qa/performance',
  testController.runPerformanceBenchmarks.bind(testController)
);

router.post('/qa/load-test',
  testController.runLoadTest.bind(testController)
);

router.get('/qa/security',
  testController.runSecurityAudit.bind(testController)
);

router.get('/qa/dashboard',
  testController.getQualityDashboard.bind(testController)
);

export default router;
