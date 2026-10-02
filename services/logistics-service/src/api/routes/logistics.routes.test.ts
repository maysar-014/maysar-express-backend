import express from 'express';
import request from 'supertest';

const mockValidationResult = jest.fn();

const passthrough = (_req: express.Request, _res: express.Response, next: express.NextFunction): void => next();
const createValidation = (): express.RequestHandler[] => [passthrough];
const createControllerHandler = (tag: string) =>
  jest.fn(async (_req: express.Request, res: express.Response) => {
    res.status(200).json({ ok: true, handler: tag });
  });

const mockDeliveryController = {
  createDelivery: createControllerHandler('createDelivery'),
  getDelivery: createControllerHandler('getDelivery'),
  getDeliveries: createControllerHandler('getDeliveries'),
  updateDeliveryStatus: createControllerHandler('updateDeliveryStatus')
};

const mockRouteController = {
  getRoutes: createControllerHandler('getRoutes'),
  getCourierRoutes: createControllerHandler('getCourierRoutes'),
  optimizeRoute: createControllerHandler('optimizeRoute'),
  getRoute: createControllerHandler('getRoute'),
  updateRouteProgress: createControllerHandler('updateRouteProgress'),
  getAlternativeRoutes: createControllerHandler('getAlternativeRoutes')
};

const mockCourierController = {
  getCouriers: createControllerHandler('getCouriers'),
  getCourier: createControllerHandler('getCourier'),
  updateCourierStatus: createControllerHandler('updateCourierStatus')
};

const mockTrackingController = {
  getTrackingHistory: createControllerHandler('getTrackingHistory'),
  storeLocationUpdate: createControllerHandler('storeLocationUpdate'),
  getCourierLocationHistory: createControllerHandler('getCourierLocationHistory')
};

const mockEarningsController = {
  getEarnings: createControllerHandler('getEarnings'),
  getCourierEarnings: createControllerHandler('getCourierEarnings'),
  recordEarnings: createControllerHandler('recordEarnings'),
  calculateCommissions: createControllerHandler('calculateCommissions'),
  getEarningsSummary: createControllerHandler('getEarningsSummary')
};

const mockAnalyticsController = {
  getAnalytics: createControllerHandler('getAnalytics'),
  getPerformanceMetrics: createControllerHandler('getPerformanceMetrics'),
  getCourierAnalytics: createControllerHandler('getCourierAnalytics')
};

const mockTestController = {
  testAllEngines: createControllerHandler('testAllEngines'),
  healthCheck: createControllerHandler('healthCheck'),
  getInfrastructureMetrics: createControllerHandler('getInfrastructureMetrics'),
  runArchitecturalAnalysis: createControllerHandler('runArchitecturalAnalysis'),
  runPerformanceBenchmarks: createControllerHandler('runPerformanceBenchmarks'),
  runLoadTest: createControllerHandler('runLoadTest'),
  runSecurityAudit: createControllerHandler('runSecurityAudit'),
  getQualityDashboard: createControllerHandler('getQualityDashboard')
};

const mockCODController = {
  generateOTP: createControllerHandler('generateOTP'),
  verifyDelivery: createControllerHandler('verifyDelivery')
};

jest.mock('express-rate-limit', () => jest.fn(() => passthrough));
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({})));
jest.mock('../../../../../shared/middleware/redis-rate-limit.store', () => ({
  RedisRateLimitStore: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('@shared/middleware/idempotency', () => ({
  IdempotencyMiddleware: jest.fn().mockImplementation(() => ({
    middleware: () => passthrough
  }))
}));
jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: passthrough
}));
jest.mock('../../infrastructure/container', () => ({
  DependencyContainer: {
    getInstance: jest.fn(() => ({}))
  }
}));
jest.mock(
  'express-validator',
  () => ({
    validationResult: (...args: unknown[]) => mockValidationResult(...args)
  }),
  { virtual: true }
);

jest.mock('../validators/delivery.validator', () => ({
  DeliveryValidator: {
    createDelivery: () => createValidation(),
    getDelivery: () => createValidation(),
    getDeliveries: () => createValidation(),
    updateDeliveryStatus: () => createValidation()
  }
}));
jest.mock('../validators/route.validator', () => ({
  RouteValidator: {
    optimizeRoute: () => createValidation(),
    getRoute: () => createValidation(),
    updateRouteProgress: () => createValidation()
  }
}));
jest.mock('../validators/earnings.validator', () => ({
  EarningsValidator: {
    getEarnings: () => createValidation(),
    getCourierEarningsReport: () => createValidation(),
    recordEarnings: () => createValidation(),
    calculateCommissions: () => createValidation(),
    getEarningsSummary: () => createValidation()
  }
}));
jest.mock('../validators/tracking.validator', () => ({
  TrackingValidator: {
    getTrackingHistory: () => createValidation(),
    storeLocationUpdate: () => createValidation(),
    getCourierLocationHistory: () => createValidation()
  }
}));
jest.mock('../validators/analytics.validator', () => ({
  AnalyticsValidator: {
    getAnalytics: () => createValidation()
  }
}));

jest.mock('../controllers/delivery.controller', () => ({
  DeliveryController: jest.fn().mockImplementation(() => mockDeliveryController)
}));
jest.mock('../controllers/route.controller', () => ({
  RouteController: jest.fn().mockImplementation(() => mockRouteController)
}));
jest.mock('../controllers/courier.controller', () => ({
  CourierController: jest.fn().mockImplementation(() => mockCourierController)
}));
jest.mock('../controllers/tracking.controller', () => ({
  TrackingController: jest.fn().mockImplementation(() => mockTrackingController)
}));
jest.mock('../controllers/earnings.controller', () => ({
  EarningsController: jest.fn().mockImplementation(() => mockEarningsController)
}));
jest.mock('../controllers/analytics.controller', () => ({
  AnalyticsController: jest.fn().mockImplementation(() => mockAnalyticsController)
}));
jest.mock('../controllers/test.controller', () => ({
  TestController: jest.fn().mockImplementation(() => mockTestController)
}));
jest.mock('../controllers/cod.controller', () => ({
  CODController: jest.fn().mockImplementation(() => mockCODController)
}));

import router from './logistics.routes';

const app = express();
app.use(express.json());
app.use('/api/v1', router);

describe('logistics.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  it('registers expected high-value endpoints', () => {
    const endpoints = router.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => ((layer as { route: { path: string } }).route.path));

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/deliveries',
        '/deliveries/:deliveryId',
        '/cod/:deliveryId/otp',
        '/routes',
        '/tracking/location',
        '/analytics',
        '/earnings',
        '/stats/performance',
        '/engines/status',
        '/qa/dashboard'
      ])
    );
  });

  it('delegates API calls to lazily constructed controllers', async () => {
    const createRes = await request(app).post('/api/v1/deliveries').send({ orderId: 'ORD-20260927-3C8B' });
    expect(createRes.status).toBe(200);
    expect(createRes.body).toEqual(expect.objectContaining({ handler: 'createDelivery' }));
    expect(mockDeliveryController.createDelivery).toHaveBeenCalled();

    const analyticsRes = await request(app).get('/api/v1/analytics/performance');
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body).toEqual(expect.objectContaining({ handler: 'getPerformanceMetrics' }));
    expect(mockAnalyticsController.getPerformanceMetrics).toHaveBeenCalled();

    const qaRes = await request(app).get('/api/v1/qa/architecture');
    expect(qaRes.status).toBe(200);
    expect(qaRes.body).toEqual(expect.objectContaining({ handler: 'runArchitecturalAnalysis' }));
    expect(mockTestController.runArchitecturalAnalysis).toHaveBeenCalled();
  });

  it('returns request validation errors when express-validator reports failures', async () => {
    mockValidationResult.mockReturnValueOnce({
      isEmpty: () => false,
      array: () => [{ msg: 'invalid query' }]
    });

    const res = await request(app).get('/api/v1/analytics');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      errors: [{ msg: 'invalid query' }]
    });
    expect(mockAnalyticsController.getAnalytics).not.toHaveBeenCalled();
  });

  it('serves inline static endpoints for history, service stats, and engine status', async () => {
    const historyRes = await request(app).get('/api/v1/deliveries/d-1/history');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.success).toBe(true);
    expect(historyRes.body.data.history).toHaveLength(4);

    const perfRes = await request(app).get('/api/v1/stats/performance');
    expect(perfRes.status).toBe(200);
    expect(perfRes.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          service: 'logistics-service'
        })
      })
    );

    const enginesRes = await request(app).get('/api/v1/engines/status');
    expect(enginesRes.status).toBe(200);
    expect(enginesRes.body.data.totalEngines).toBe(11);
    expect(enginesRes.body.data.healthyEngines).toBe(11);
  });
});
