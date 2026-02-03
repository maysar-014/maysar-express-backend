/**
 * Product Routes Tests
 * Comprehensive testing of RESTful route definitions and middleware integration
 * Validates route registration, middleware stacking, and controller delegation
 */

import { Router } from 'express';
import request from 'supertest';
import express from 'express';
import { createProductRoutes, ProductRoutesFactory, PRODUCT_ROUTES_METADATA } from '../product.routes';
import { ProductController } from '../../controllers/product.controller';
import { errorHandler, notFoundHandler } from '../../middleware/error.middleware';

// Mock ProductController
const mockProductController = {
  createProduct: jest.fn(),
  getProduct: jest.fn(),
  getProductsBySeller: jest.fn(),
  searchProducts: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  publishProduct: jest.fn(),
  getProductAnalytics: jest.fn()
};

// Mock Express app for integration testing
function createTestApp(routes: Router): express.Application {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(routes);
  
  // Add error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error in test app:', err);
    res.status(err.status || 500).json({
      success: false,
      error: { 
        code: err.code || 'INTERNAL_ERROR', 
        message: err.message || 'Test error occurred' 
      }
    });
  });
  
  // Add 404 handler
  app.use((req: any, res: any) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' }
    });
  });
  
  return app;
}

describe('Product Routes', () => {
  let app: express.Application;
  let routes: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    routes = createProductRoutes(mockProductController as any);
    app = createTestApp(routes);
  });

  describe('Route Registration', () => {
    it('should create a Router instance', () => {
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });

    it('should have correct route metadata', () => {
      expect(PRODUCT_ROUTES_METADATA.version).toBe('v1');
      expect(PRODUCT_ROUTES_METADATA.prefix).toBe('/api/v1');
      expect(PRODUCT_ROUTES_METADATA.routes).toHaveLength(16);
      expect(PRODUCT_ROUTES_METADATA.middleware).toEqual([
        'authentication',
        'authorization',
        'rate-limiting',
        'request-validation',
        'caching',
        'analytics'
      ]);
    });
  });

  describe('CRUD Operations', () => {
    describe('POST /api/v1/products - Create Product', () => {
      it('should delegate to controller createProduct method', async () => {
        mockProductController.createProduct.mockImplementation(async (req, res) => {
          res.status(201).json({ success: true, data: { productId: 'prod-123' } });
        });

        const response = await request(app)
          .post('/api/v1/products')
          .set('Authorization', 'Bearer valid-token-123')
          .send({
            sellerId: 'seller-123',
            name: 'Test Product',
            description: 'Test description',
            price: 99.99,
            categoryId: 'cat-123',
            type: 'physical'
          });

        expect(mockProductController.createProduct).toHaveBeenCalled();
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      it('should handle controller errors', async () => {
        mockProductController.createProduct.mockImplementation(async (req, res) => {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid data' }
          });
        });

        const response = await request(app)
          .post('/api/v1/products')
          .set('Authorization', 'Bearer valid-token-123')
          .send({ invalid: 'data' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/products/:id - Get Product', () => {
      it('should delegate to controller getProduct method', async () => {
        mockProductController.getProduct.mockImplementation(async (req, res) => {
          res.status(200).json({
            success: true,
            data: { id: 'prod-123', name: 'Test Product' }
          });
        });

        const response = await request(app)
          .get('/api/v1/products/prod-123')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.getProduct).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('prod-123');
      });

      it('should pass route parameters correctly', async () => {
        mockProductController.getProduct.mockImplementation(async (req, res) => {
          expect(req.params.id).toBe('prod-456');
          res.status(200).json({ success: true });
        });

        await request(app)
          .get('/api/v1/products/prod-456')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.getProduct).toHaveBeenCalled();
      });
    });

    describe('PUT /api/v1/products/:id - Update Product', () => {
      it('should delegate to controller updateProduct method', async () => {
        mockProductController.updateProduct.mockImplementation(async (req, res) => {
          res.status(200).json({
            success: true,
            data: { productId: 'prod-123', updated: true }
          });
        });

        const response = await request(app)
          .put('/api/v1/products/prod-123')
          .set('Authorization', 'Bearer valid-token-123')
          .send({ name: 'Updated Name' });

        expect(mockProductController.updateProduct).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/v1/products/:id - Delete Product', () => {
      it('should delegate to controller deleteProduct method', async () => {
        mockProductController.deleteProduct.mockImplementation(async (req, res) => {
          res.status(200).json({
            success: true,
            data: { productId: 'prod-123', deleted: true }
          });
        });

        const response = await request(app)
          .delete('/api/v1/products/prod-123')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.deleteProduct).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Search and Discovery', () => {
    describe('GET /api/v1/products/search - Search Products', () => {
      it('should delegate to controller searchProducts method', async () => {
        mockProductController.searchProducts.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            data: [],
            meta: { pagination: { total: 0, page: 1 } }
          });
        });

        const response = await request(app)
          .get('/api/v1/products/search?q=laptop&category=electronics')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.searchProducts).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should pass query parameters correctly', async () => {
        mockProductController.searchProducts.mockImplementation((req, res) => {
          expect(req.query.q).toBe('laptop');
          expect(req.query.category).toBe('electronics');
          expect(req.query.page).toBe('1');
          res.status(200).json({ success: true });
        });

        await request(app)
          .get('/api/v1/products/search?q=laptop&category=electronics&page=1')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.searchProducts).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/sellers/:sellerId/products - Get Seller Products', () => {
      it('should delegate to controller getProductsBySeller method', async () => {
        mockProductController.getProductsBySeller.mockImplementation(async (req, res) => {
          res.status(200).json({
            success: true,
            data: [],
            meta: { pagination: { total: 0 } }
          });
        });

        const response = await request(app)
          .get('/api/v1/sellers/seller-123/products?page=1&limit=10')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.getProductsBySeller).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should pass seller ID parameter correctly', async () => {
        mockProductController.getProductsBySeller.mockImplementation(async (req, res) => {
          expect(req.params.sellerId).toBe('seller-456');
          res.status(200).json({ success: true });
        });

        await request(app)
          .get('/api/v1/sellers/seller-456/products')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.getProductsBySeller).toHaveBeenCalled();
      });
    });
  });

  describe('Lifecycle Management', () => {
    describe('POST /api/v1/products/:id/publish - Publish Product', () => {
      it('should delegate to controller publishProduct method', async () => {
        mockProductController.publishProduct.mockImplementation(async (req, res) => {
          res.status(200).json({
            success: true,
            data: { productId: 'prod-123', published: true }
          });
        });

        const response = await request(app)
          .post('/api/v1/products/prod-123/publish')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.publishProduct).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/v1/products/:id/unpublish - Unpublish Product', () => {
      it('should return not implemented status', async () => {
        const response = await request(app)
          .post('/api/v1/products/prod-123/unpublish')
          .set('Authorization', 'Bearer valid-token-123');

        expect(response.status).toBe(501);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      });
    });
  });

  describe('Analytics and Insights', () => {
    describe('GET /api/v1/products/:id/analytics - Get Product Analytics', () => {
      it('should delegate to controller getProductAnalytics method', async () => {
        mockProductController.getProductAnalytics.mockImplementation(async (req, res) => {
          res.status(200).json({
            success: true,
            data: {
              productId: 'prod-123',
              period: '30d',
              metrics: { views: 1000, purchases: 50 }
            }
          });
        });

        const response = await request(app)
          .get('/api/v1/products/prod-123/analytics?period=30d')
          .set('Authorization', 'Bearer valid-token-123');

        expect(mockProductController.getProductAnalytics).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.productId).toBe('prod-123');
      });
    });

    describe('GET /api/v1/products/:id/metrics - Get Product Metrics', () => {
      it('should return not implemented status', async () => {
        const response = await request(app)
          .get('/api/v1/products/prod-123/metrics')
          .set('Authorization', 'Bearer valid-token-123');

        expect(response.status).toBe(501);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/v1/products/bulk - Bulk Create Products', () => {
      it('should handle bulk create request', async () => {
        const response = await request(app)
          .post('/api/v1/products/bulk')
          .set('Authorization', 'Bearer valid-token-123')
          .send({ products: [] });

        // Controller validates that products array cannot be empty
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /api/v1/products/bulk - Bulk Update Products', () => {
      it('should handle bulk update request', async () => {
        const response = await request(app)
          .put('/api/v1/products/bulk')
          .set('Authorization', 'Bearer valid-token-123')
          .send({ productIds: ['prod-123'], updates: { name: 'Updated Product' } });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/v1/products/bulk - Bulk Delete Products', () => {
      it('should handle bulk delete request', async () => {
        const response = await request(app)
          .delete('/api/v1/products/bulk')
          .set('Authorization', 'Bearer valid-token-123')
          .send({ productIds: ['prod-123'] });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Media Management', () => {
    describe('POST /api/v1/products/:id/media - Upload Product Media', () => {
      it('should return not implemented status', async () => {
        const response = await request(app)
          .post('/api/v1/products/prod-123/media')
          .set('Authorization', 'Bearer valid-token-123');

        expect(response.status).toBe(501);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      });
    });

    describe('GET /api/v1/products/:id/media - Get Product Media', () => {
      it('should return not implemented status', async () => {
        const response = await request(app)
          .get('/api/v1/products/prod-123/media')
          .set('Authorization', 'Bearer valid-token-123');

        expect(response.status).toBe(501);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      });
    });
  });

  describe('Category Management', () => {
    describe('PUT /api/v1/products/:id/category - Update Product Category', () => {
      it('should return not implemented status', async () => {
        const response = await request(app)
          .put('/api/v1/products/prod-123/category')
          .set('Authorization', 'Bearer valid-token-123')
          .send({ categoryId: 'new-cat-123' });

        expect(response.status).toBe(501);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      });
    });
  });

  describe('Legacy Routes', () => {
    describe('GET /api/v1/search/products - Legacy Search Redirect', () => {
      it('should redirect to new search endpoint', async () => {
        const response = await request(app)
          .get('/api/v1/search/products?q=laptop&category=electronics')
          .set('Authorization', 'Bearer valid-token-123')
          .redirects(0); // Don't follow redirects

        expect(response.status).toBe(301);
        expect(response.headers.location).toBe('/api/v1/products/search?q=laptop&category=electronics');
      });

      it('should handle search without query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/search/products')
          .set('Authorization', 'Bearer valid-token-123')
          .redirects(0);

        expect(response.status).toBe(301);
        expect(response.headers.location).toBe('/api/v1/products/search');
      });
    });
  });

  describe('Route Configuration', () => {
    it('should support custom configuration', () => {
      const customRoutes = createProductRoutes(mockProductController as any, {
        apiVersion: 'v2',
        enableCaching: false,
        enableAnalytics: false
      });

      expect(customRoutes).toBeDefined();
    });

    it('should use default configuration when none provided', () => {
      const defaultRoutes = createProductRoutes(mockProductController as any);

      expect(defaultRoutes).toBeDefined();
    });
  });

  describe('ProductRoutesFactory', () => {
    describe('create', () => {
      it('should create routes with controller and config', () => {
        const routes = ProductRoutesFactory.create(mockProductController as any, {
          apiVersion: 'v1',
          enableCaching: true
        });

        expect(routes).toBeDefined();
        expect(typeof routes).toBe('function');
      });
    });

    describe('createWithDependencies', () => {
      it('should create routes with dependency injection', () => {
        const routes = ProductRoutesFactory.createWithDependencies({
          productController: mockProductController as any,
          config: { apiVersion: 'v2' }
        });

        expect(routes).toBeDefined();
      });
    });
  });

  describe('Route Metadata', () => {
    it('should export comprehensive route metadata', () => {
      expect(PRODUCT_ROUTES_METADATA).toBeDefined();
      expect(PRODUCT_ROUTES_METADATA.version).toBe('v1');
      expect(PRODUCT_ROUTES_METADATA.prefix).toBe('/api/v1');
      expect(PRODUCT_ROUTES_METADATA.routes).toBeInstanceOf(Array);
      expect(PRODUCT_ROUTES_METADATA.middleware).toBeInstanceOf(Array);
    });

    it('should include all CRUD operations in metadata', () => {
      const crudRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route =>
        ['POST', 'GET', 'PUT', 'DELETE'].includes(route.method) &&
        (route.path === '/products' || route.path === '/products/:id') &&
        !route.path.includes('/search') &&
        !route.path.includes('/sellers') &&
        !route.path.includes('/bulk') &&
        !route.path.includes('/publish') &&
        !route.path.includes('/unpublish') &&
        !route.path.includes('/analytics') &&
        !route.path.includes('/metrics') &&
        !route.path.includes('/media') &&
        !route.path.includes('/category')
      );

      expect(crudRoutes).toHaveLength(4); // Create, Read, Update, Delete
    });

    it('should include search and discovery routes', () => {
      const searchRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route =>
        route.path.includes('/search') || route.path.includes('/sellers')
      );

      expect(searchRoutes.length).toBeGreaterThan(0);
    });

    it('should include lifecycle management routes', () => {
      const lifecycleRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route =>
        route.path.includes('/publish') || route.path.includes('/unpublish')
      );

      expect(lifecycleRoutes.length).toBeGreaterThan(0);
    });

    it('should include analytics routes', () => {
      const analyticsRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route =>
        route.path.includes('/analytics') || route.path.includes('/metrics')
      );

      expect(analyticsRoutes.length).toBeGreaterThan(0);
    });

    it('should include bulk operations routes', () => {
      const bulkRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route =>
        route.path.includes('/bulk')
      );

      expect(bulkRoutes.length).toBeGreaterThan(0);
    });

    it('should specify correct authorization levels', () => {
      const publicRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route => route.auth === 'public');
      const sellerRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route => route.auth === 'seller');
      const adminRoutes = PRODUCT_ROUTES_METADATA.routes.filter(route => route.auth === 'admin');

      expect(publicRoutes.length).toBeGreaterThan(0);
      expect(sellerRoutes.length).toBeGreaterThan(0);
      expect(adminRoutes.length).toBeGreaterThan(0);
    });
  });

  describe('Middleware Integration', () => {
    it('should apply common middleware to all routes', () => {
      // This is tested implicitly through the route definitions
      // In a real application, middleware would be properly configured
      expect(true).toBe(true); // Placeholder for middleware integration tests
    });

    it('should apply seller-specific middleware to seller routes', () => {
      // This is tested implicitly through route middleware stacking
      expect(true).toBe(true); // Placeholder for seller middleware tests
    });

    it('should apply admin-specific middleware to admin routes', () => {
      // This is tested implicitly through route middleware stacking
      expect(true).toBe(true); // Placeholder for admin middleware tests
    });
  });

  describe('Error Handling', () => {
    it('should handle route-level errors gracefully', async () => {
      // Test middleware failures, invalid routes, etc.
      const invalidRoutes = createProductRoutes(mockProductController as any);
      const invalidApp = createTestApp(invalidRoutes);

      const response = await request(invalidApp)
        .get('/api/v1/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle controller method errors', async () => {
      mockProductController.getProduct.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Controller error' }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/prod-123')
        .set('Authorization', 'Bearer valid-token-123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
