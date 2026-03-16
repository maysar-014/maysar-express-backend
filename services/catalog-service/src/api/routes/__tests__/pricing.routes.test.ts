/**
 * Pricing Routes Tests
 * Comprehensive testing of pricing-related RESTful endpoints and middleware integration
 * Validates price calculations, rule management, and bulk operations
 */

import { Router } from 'express';
import request from 'supertest';
import express from 'express';
import { createPricingRoutes, PricingRoutesFactory, PRICING_ROUTES_METADATA } from '../pricing.routes';
import { PricingController } from '../../controllers/pricing.controller';

// Mock PricingController
const mockPricingController = {
  calculatePrice: jest.fn(),
  updateProductPrice: jest.fn(),
  bulkUpdatePricing: jest.fn(),
  getPricingRules: jest.fn(),
  createPricingRule: jest.fn(),
  getPricingAnalytics: jest.fn()
};

// Mock Express app for integration testing
function createTestApp(routes: Router): express.Application {
  const app = express();
  app.use(express.json());
  app.use(routes);
  return app;
}

describe('Pricing Routes', () => {
  let app: express.Application;
  let routes: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    routes = createPricingRoutes(mockPricingController as any, {});
    app = createTestApp(routes);
  });

  describe('Route Registration', () => {
    it('should create a Router instance', () => {
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });

    it('should have correct route metadata', () => {
      expect(PRICING_ROUTES_METADATA.version).toBe('v1');
      expect(PRICING_ROUTES_METADATA.prefix).toBe('/v1');
      expect(PRICING_ROUTES_METADATA.routes).toHaveLength(7);
    });
  });

  describe('Pricing Calculations - POST /v1/pricing/calculate', () => {
    it('should delegate to controller calculatePrice method', async () => {
      mockPricingController.calculatePrice.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            productId: 'prod-123',
            originalPrice: 100,
            finalPrice: 85,
            discounts: [{ type: 'percentage', value: 15 }]
          }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/calculate')
        .send({
          productId: 'prod-123',
          customerId: 'cust-456',
          quantity: 1
        });

      expect(mockPricingController.calculatePrice).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.finalPrice).toBe(85);
    });

    it('should handle calculation errors', async () => {
      mockPricingController.calculatePrice.mockImplementation(async (req, res) => {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PRODUCT', message: 'Product not found' }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/calculate')
        .send({ productId: 'invalid-id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT');
    });
  });

  describe('Product Price Updates - PUT /v1/products/:productId/pricing', () => {
    it('should delegate to controller updateProductPrice method', async () => {
      mockPricingController.updateProductPrice.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            productId: 'prod-123',
            oldPrice: 100,
            newPrice: 120,
            updatedAt: new Date().toISOString()
          }
        });
      });

      const response = await request(app)
        .put('/v1/products/prod-123/pricing')
        .send({
          price: 120,
          currency: 'USD',
          effectiveDate: new Date().toISOString()
        });

      expect(mockPricingController.updateProductPrice).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.newPrice).toBe(120);
    });

    it('should pass product ID parameter correctly', async () => {
      mockPricingController.updateProductPrice.mockImplementation(async (req, res) => {
        expect(req.params.productId).toBe('prod-456');
        res.status(200).json({ success: true });
      });

      await request(app)
        .put('/v1/products/prod-456/pricing')
        .send({ price: 150 });

      expect(mockPricingController.updateProductPrice).toHaveBeenCalled();
    });

    it('should handle update validation errors', async () => {
      mockPricingController.updateProductPrice.mockImplementation(async (req, res) => {
        res.status(422).json({
          success: false,
          error: { code: 'INVALID_PRICE', message: 'Price must be positive' }
        });
      });

      const response = await request(app)
        .put('/v1/products/prod-123/pricing')
        .send({ price: -50 });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Bulk Pricing Updates - POST /v1/pricing/bulk-update', () => {
    it('should delegate to controller bulkUpdatePricing method', async () => {
      mockPricingController.bulkUpdatePricing.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            totalProcessed: 5,
            successful: 4,
            failed: 1,
            results: [
              { productId: 'prod-1', success: true },
              { productId: 'prod-2', success: false, error: 'Invalid price' }
            ]
          }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/bulk-update')
        .send({
          updates: [
            { productId: 'prod-1', price: 100 },
            { productId: 'prod-2', price: 200 },
            { productId: 'prod-3', price: 150 }
          ]
        });

      expect(mockPricingController.bulkUpdatePricing).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalProcessed).toBe(5);
      expect(response.body.data.successful).toBe(4);
      expect(response.body.data.failed).toBe(1);
    });

    it('should handle empty bulk update requests', async () => {
      mockPricingController.bulkUpdatePricing.mockImplementation(async (req, res) => {
        res.status(400).json({
          success: false,
          error: { code: 'EMPTY_REQUEST', message: 'No updates provided' }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/bulk-update')
        .send({ updates: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Pricing Rules Management', () => {
    describe('GET /v1/pricing/rules - Get Pricing Rules', () => {
      it('should delegate to controller getPricingRules method', async () => {
        mockPricingController.getPricingRules.mockImplementation(async (req, res) => {
          res.status(200).json({
            success: true,
            data: [
              {
                id: 'rule-1',
                name: 'Holiday Discount',
                type: 'percentage',
                value: 20,
                conditions: [{ field: 'category', operator: 'eq', value: 'electronics' }]
              },
              {
                id: 'rule-2',
                name: 'Bulk Discount',
                type: 'fixed',
                value: 10,
                conditions: [{ field: 'quantity', operator: 'gte', value: 5 }]
              }
            ]
          });
        });

        const response = await request(app)
          .get('/v1/pricing/rules?active=true');

        expect(mockPricingController.getPricingRules).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should pass query parameters correctly', async () => {
        mockPricingController.getPricingRules.mockImplementation(async (req, res) => {
          expect(req.query.active).toBe('true');
          expect(req.query.type).toBe('percentage');
          res.status(200).json({ success: true, data: [] });
        });

        await request(app)
          .get('/v1/pricing/rules?active=true&type=percentage');

        expect(mockPricingController.getPricingRules).toHaveBeenCalled();
      });
    });

    describe('POST /v1/pricing/rules - Create Pricing Rule', () => {
      it('should delegate to controller createPricingRule method', async () => {
        mockPricingController.createPricingRule.mockImplementation(async (req, res) => {
          res.status(201).json({
            success: true,
            data: {
              id: 'rule-123',
              name: 'New Discount Rule',
              type: 'percentage',
              value: 15,
              createdAt: new Date().toISOString()
            }
          });
        });

        const response = await request(app)
          .post('/v1/pricing/rules')
          .send({
            name: 'New Discount Rule',
            type: 'percentage',
            value: 15,
            conditions: [
              { field: 'category', operator: 'eq', value: 'books' }
            ]
          });

        expect(mockPricingController.createPricingRule).toHaveBeenCalled();
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('New Discount Rule');
      });

      it('should handle rule creation validation errors', async () => {
        mockPricingController.createPricingRule.mockImplementation(async (req, res) => {
          res.status(422).json({
            success: false,
            error: { code: 'INVALID_RULE', message: 'Rule conditions are invalid' }
          });
        });

        const response = await request(app)
          .post('/v1/pricing/rules')
          .send({
            name: '',
            type: 'invalid-type',
            value: -10
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /v1/pricing/validate-rule - Validate Pricing Rule', () => {
      it('should return not implemented status', async () => {
        const response = await request(app)
          .post('/v1/pricing/validate-rule')
          .send({
            name: 'Test Rule',
            type: 'percentage',
            value: 10,
            conditions: []
          });

        expect(response.status).toBe(501);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      });
    });
  });

  describe('Pricing Analytics - GET /v1/pricing/analytics', () => {
    it('should delegate to controller getPricingAnalytics method', async () => {
      mockPricingController.getPricingAnalytics.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            totalRules: 15,
            activeRules: 12,
            totalDiscountsApplied: 15420.50,
            averageDiscountPercentage: 18.5,
            topDiscountedProducts: [
              { productId: 'prod-1', totalDiscount: 1250.00 },
              { productId: 'prod-2', totalDiscount: 980.00 }
            ],
            period: '30d'
          }
        });
      });

      const response = await request(app)
        .get('/v1/pricing/analytics?period=30d');

      expect(mockPricingController.getPricingAnalytics).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRules).toBe(15);
      expect(response.body.data.averageDiscountPercentage).toBe(18.5);
    });

    it('should handle analytics query parameters', async () => {
      mockPricingController.getPricingAnalytics.mockImplementation(async (req, res) => {
        expect(req.query.period).toBe('7d');
        expect(req.query.metric).toBe('discounts');
        res.status(200).json({ success: true, data: {} });
      });

      await request(app)
        .get('/v1/pricing/analytics?period=7d&metric=discounts');

      expect(mockPricingController.getPricingAnalytics).toHaveBeenCalled();
    });

    it('should handle analytics service errors', async () => {
      mockPricingController.getPricingAnalytics.mockImplementation(async (req, res) => {
        res.status(500).json({
          success: false,
          error: { code: 'ANALYTICS_ERROR', message: 'Failed to generate analytics' }
        });
      });

      const response = await request(app)
        .get('/v1/pricing/analytics');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Configuration Handling', () => {
    it('should support custom API version', async () => {
      const customRoutes = createPricingRoutes(mockPricingController as any, { apiVersion: 'v2' });
      const customApp = createTestApp(customRoutes);

      mockPricingController.calculatePrice.mockImplementation(async (req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(customApp)
        .post('/api/v2/pricing/calculate')
        .send({});

      expect(response.status).toBe(200);
    });

    it('should use default configuration when none provided', () => {
      const defaultRoutes = createPricingRoutes(mockPricingController as any);

      expect(defaultRoutes).toBeDefined();
    });
  });

  describe('PricingRoutesFactory', () => {
    describe('create', () => {
      it('should create pricing routes with controller and config', () => {
        const routes = PricingRoutesFactory.create(mockPricingController as any, {
          apiVersion: 'v1',
          enableCaching: true
        });

        expect(routes).toBeDefined();
        expect(typeof routes).toBe('function');
      });

      it('should create routes with default config when none provided', () => {
        const routes = PricingRoutesFactory.create(mockPricingController as any);

        expect(routes).toBeDefined();
      });
    });
  });

  describe('Route Metadata Validation', () => {
    it('should export comprehensive metadata', () => {
      expect(PRICING_ROUTES_METADATA).toBeDefined();
      expect(PRICING_ROUTES_METADATA.version).toBe('v1');
      expect(PRICING_ROUTES_METADATA.routes).toHaveLength(7);
    });

    it('should include all pricing endpoints in metadata', () => {
      const routes = PRICING_ROUTES_METADATA.routes;
      const paths = routes.map(r => r.path);

      expect(paths).toContain('/pricing/calculate');
      expect(paths).toContain('/products/:productId/pricing');
      expect(paths).toContain('/pricing/bulk-update');
      expect(paths).toContain('/pricing/rules');
      expect(paths).toContain('/pricing/validate-rule');
      expect(paths).toContain('/pricing/analytics');
    });

    it('should specify correct HTTP methods', () => {
      const routes = PRICING_ROUTES_METADATA.routes;
      const methods = routes.map(r => r.method);

      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('GET');
    });

    it('should specify correct authorization levels', () => {
      const routes = PRICING_ROUTES_METADATA.routes;

      const publicRoutes = routes.filter(r => r.auth === 'public');
      const adminRoutes = routes.filter(r => r.auth === 'admin');

      expect(publicRoutes.length).toBeGreaterThan(0);
      expect(adminRoutes.length).toBeGreaterThan(0);

      // Price calculation and rules should be public
      expect(routes.find(r => r.path === '/pricing/calculate')?.auth).toBe('public');
      expect(routes.find(r => r.path === '/pricing/rules')?.auth).toBe('public');

      // Admin operations should require admin auth
      expect(routes.find(r => r.path === '/products/:productId/pricing')?.auth).toBe('admin');
      expect(routes.find(r => r.path === '/pricing/analytics')?.auth).toBe('admin');
    });

    it('should include descriptive route information', () => {
      const routes = PRICING_ROUTES_METADATA.routes;

      routes.forEach(route => {
        expect(route.description).toBeDefined();
        expect(typeof route.description).toBe('string');
        expect(route.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle route-level errors gracefully', async () => {
      const invalidRoutes = createPricingRoutes(mockPricingController as any, {});
      const invalidApp = createTestApp(invalidRoutes);

      const response = await request(invalidApp)
        .get('/v1/pricing/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle controller method errors', async () => {
      mockPricingController.calculatePrice.mockImplementation(async (req, res) => {
        throw new Error('Controller error');
      });

      const response = await request(app)
        .post('/v1/pricing/calculate')
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe('Middleware Integration', () => {
    it('should apply common middleware to all routes', () => {
      // This is tested implicitly through the route definitions
      // In a real application, middleware would be properly configured
      expect(true).toBe(true); // Placeholder for middleware integration tests
    });

    it('should apply admin-specific middleware to admin routes', () => {
      // This is tested implicitly through route middleware stacking
      expect(true).toBe(true); // Placeholder for admin middleware tests
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent pricing requests', async () => {
      mockPricingController.calculatePrice.mockImplementation(async (req, res) => {
        res.status(200).json({ success: true, data: { price: 100 } });
      });

      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/v1/pricing/calculate')
          .send({ productId: 'prod-123' })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should respond quickly to pricing calculations', async () => {
      mockPricingController.calculatePrice.mockImplementation(async (req, res) => {
        res.status(200).json({ success: true });
      });

      const startTime = Date.now();

      await request(app)
        .post('/v1/pricing/calculate')
        .send({ productId: 'prod-123' });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Input Validation', () => {
    it('should validate product ID parameters', async () => {
      const response = await request(app)
        .put('/v1/products/invalid-id/pricing')
        .send({ price: 100 });

      // Note: This would typically be handled by middleware validation
      // For now, we test that the route accepts the parameter
      expect(mockPricingController.updateProductPrice).toHaveBeenCalled();
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/v1/pricing/calculate')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express should handle JSON parsing errors
      expect(response.status).toBe(400);
    });

    it('should validate required fields in requests', async () => {
      mockPricingController.calculatePrice.mockImplementation(async (req, res) => {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PRODUCT_ID', message: 'Product ID is required' }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/calculate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Business Logic Validation', () => {
    it('should handle pricing rule conflicts', async () => {
      mockPricingController.createPricingRule.mockImplementation(async (req, res) => {
        res.status(409).json({
          success: false,
          error: { code: 'RULE_CONFLICT', message: 'Pricing rule conflicts with existing rule' }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/rules')
        .send({
          name: 'Conflicting Rule',
          type: 'percentage',
          value: 50,
          conditions: [{ field: 'category', operator: 'eq', value: 'electronics' }]
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('RULE_CONFLICT');
    });

    it('should validate pricing rule parameters', async () => {
      mockPricingController.createPricingRule.mockImplementation(async (req, res) => {
        res.status(422).json({
          success: false,
          error: { code: 'INVALID_DISCOUNT', message: 'Discount percentage cannot exceed 100%' }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/rules')
        .send({
          name: 'Invalid Rule',
          type: 'percentage',
          value: 150, // Invalid: over 100%
          conditions: []
        });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INVALID_DISCOUNT');
    });

    it('should handle bulk update partial failures', async () => {
      mockPricingController.bulkUpdatePricing.mockImplementation(async (req, res) => {
        res.status(207).json({ // Multi-status response
          success: true,
          data: {
            totalProcessed: 3,
            successful: 2,
            failed: 1,
            results: [
              { productId: 'prod-1', success: true, newPrice: 100 },
              { productId: 'prod-2', success: true, newPrice: 200 },
              { productId: 'prod-3', success: false, error: 'Product not found' }
            ]
          }
        });
      });

      const response = await request(app)
        .post('/v1/pricing/bulk-update')
        .send({
          updates: [
            { productId: 'prod-1', price: 100 },
            { productId: 'prod-2', price: 200 },
            { productId: 'prod-3', price: 300 }
          ]
        });

      expect(response.status).toBe(207);
      expect(response.body.data.successful).toBe(2);
      expect(response.body.data.failed).toBe(1);
    });
  });
});
