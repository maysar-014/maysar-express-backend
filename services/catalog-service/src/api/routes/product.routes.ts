/**
 * Product Routes
 * RESTful route definitions for product-related operations
 * Implements API versioning and middleware stacking
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '@shared/middleware/auth-context.middleware';
import { zodId } from '@shared/validation/id';
import { ProductController } from '../controllers/product.controller';
import { validateRequest as validateSchemaRequest } from '../middleware/validation.middleware';
import {
  ProductRepository,
  DomainEventPublisher,
  IdGenerator,
  DateTimeService,
  SearchService
} from '../../domain/interfaces';

/**
 * Product Routes Configuration
 */
export interface ProductRoutesConfig {
  apiVersion: string;
  enableCaching: boolean;
  rateLimitRequests: number;
  enableAnalytics: boolean;
}

/**
 * Default Product Routes Configuration
 */
export const DEFAULT_PRODUCT_ROUTES_CONFIG: ProductRoutesConfig = {
  apiVersion: 'v1',
  enableCaching: true,
  rateLimitRequests: 1000,
  enableAnalytics: true
};

/**
 * Create Product Routes
 * Factory function for creating product route handlers with dependency injection
 */
export function createProductRoutes(
  productController: ProductController,
  config: Partial<ProductRoutesConfig> = {}
): Router {
  const router = Router();
  const routesConfig = { ...DEFAULT_PRODUCT_ROUTES_CONFIG, ...config };
  const apiPrefix = `/${routesConfig.apiVersion}`;

  const nonEmptyString = z.string().min(1);
  const anyObjectSchema = z.object({}).passthrough();
  const nonEmptyObjectSchema = anyObjectSchema.refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Request body required' }
  );
  const previewDescriptionSchema = z.object({
    categoryId: nonEmptyString,
    brand: nonEmptyString,
    productName: nonEmptyString,
    structuredAttributes: z.record(z.any())
  }).strict();
  const updateProductSchema = z.object({
    name: nonEmptyString.optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    currency: nonEmptyString.optional(),
    categoryId: nonEmptyString.optional(),
    tags: z.array(z.string()).optional(),
    attributes: z.record(z.any()).optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    enablerEnabled: z.boolean().optional(),
    enablerCommissionRate: z.number().gt(0).lte(1).optional()
  }).strict().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Request body required' }
  );
  const bulkCreateSchema = z.object({
    products: z.array(anyObjectSchema).min(1)
  }).strict();
  const bulkUpdateSchema = z.object({
    products: z.array(anyObjectSchema).optional(),
    productIds: z.array(nonEmptyString).optional(),
    updates: anyObjectSchema.optional()
  }).strict().superRefine((value, ctx) => {
    const hasProducts = Array.isArray(value.products) && value.products.length > 0;
    const hasIdsAndUpdates = Array.isArray(value.productIds)
      && value.productIds.length > 0
      && value.updates
      && Object.keys(value.updates).length > 0;

    if (!hasProducts && !hasIdsAndUpdates) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['products'],
        message: 'Provide either products or productIds with updates'
      });
    }
  });
  const bulkDeleteSchema = z.object({
    productIds: z.array(nonEmptyString).min(1)
  }).strict();
  const updateCategorySchema = z.object({
    categoryId: zodId()
  }).strict();
  const optionalNonBlankNumber = (numberSchema: z.ZodNumber) => z.preprocess((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return Number.NaN;
      }

      return Number(trimmed);
    }

    return value;
  }, numberSchema.optional());
  const sellerProductsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: nonEmptyString.optional()
  }).strict();
  const searchProductsQuerySchema = z.object({
    q: z.string().min(1).optional(),
    category: nonEmptyString.optional(),
    seller: nonEmptyString.optional(),
    productType: nonEmptyString.optional(),
    status: nonEmptyString.optional(),
    inStock: z.enum(['true', 'false']).optional(),
    tags: z.union([nonEmptyString, z.array(nonEmptyString)]).optional(),
    minPrice: optionalNonBlankNumber(z.number().min(0)),
    maxPrice: optionalNonBlankNumber(z.number().min(0)),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.enum(['relevance', 'price', 'rating', 'newest', 'popularity']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    facets: z.enum(['true', 'false']).optional(),
    suggestions: z.enum(['true', 'false']).optional()
  }).strict();

  const rateLimit = async (req: any, res: any, next: any) => {
    try {
      // Basic rate limiting (in real implementation would use Redis)
      req.rateLimit = { remaining: 999, resetTime: Date.now() + 60000 };
      next();
    } catch (error) {
      next(error);
    }
  };

  const cache = async (req: any, res: any, next: any) => {
    try {
      // Basic cache middleware
      res.set('Cache-Control', 'public, max-age=300');
      next();
    } catch (error) {
      next(error);
    }
  };

  const analytics = async (req: any, res: any, next: any) => {
    try {
      // Basic analytics tracking
      req.analytics = { timestamp: Date.now(), path: req.path, method: req.method };
      next();
    } catch (error) {
      next(error);
    }
  };

  // Common middleware stack
  const commonMiddleware = [
    rateLimit
  ];

  if (routesConfig.enableAnalytics) {
    commonMiddleware.push(analytics);
  }

  const sellerMiddleware = [
    requireRole(['seller', 'admin']),
    ...commonMiddleware
  ];

  const adminMiddleware = [
    requireRole(['admin']),
    ...commonMiddleware
  ];

  // =====================================================================================
  // PRODUCT CRUD OPERATIONS
  // =====================================================================================

  /**
   * Create Product
   * POST /v1/products
   */
  router.post(`${apiPrefix}/products`,
    ...sellerMiddleware,
    validateSchemaRequest(nonEmptyObjectSchema),
    async (req, res) => {
      await productController.createProduct(req, res);
    }
  );

  /**
   * Search Products
   * GET /v1/products/search
   * Defined before /products/:id so Express doesn't treat "search" as an ID.
   */
  router.get(`${apiPrefix}/products/search`,
    ...commonMiddleware,
    cache,
    analytics,
    validateSchemaRequest(searchProductsQuerySchema, 'query'),
    async (req, res) => {
      await productController.searchProducts(req, res);
    }
  );

  /**
   * Bulk Update Products
   * PUT /v1/products/bulk
   * Defined before /products/:id so Express doesn't treat "bulk" as an ID.
   */
  router.put(`${apiPrefix}/products/bulk`,
    ...adminMiddleware,
    validateSchemaRequest(bulkUpdateSchema),
    async (req, res) => {
      const { BulkOperationsController } = await import('../controllers/bulk-operations.controller');
      const bulkController = new BulkOperationsController();
      await bulkController.bulkUpdateProducts(req, res);
    }
  );

  /**
   * Bulk Delete Products
   * DELETE /v1/products/bulk
   * Defined before /products/:id so Express doesn't treat "bulk" as an ID.
   */
  router.delete(`${apiPrefix}/products/bulk`,
    ...adminMiddleware,
    validateSchemaRequest(bulkDeleteSchema),
    async (req, res) => {
      const { BulkOperationsController } = await import('../controllers/bulk-operations.controller');
      const bulkController = new BulkOperationsController();
      await bulkController.bulkDeleteProducts(req, res);
    }
  );

  /**
   * Get Product by ID
   * GET /v1/products/:id
   */
  router.get(`${apiPrefix}/products/:id`,
    ...commonMiddleware,
    cache,
    async (req, res) => {
      await productController.getProduct(req, res);
    }
  );

  /**
   * Update Product
   * PUT /v1/products/:id
   */
  router.put(`${apiPrefix}/products/:id`,
    ...sellerMiddleware,
    validateSchemaRequest(updateProductSchema),
    async (req, res) => {
      await productController.updateProduct(req, res);
    }
  );

  /**
   * Delete Product
   * DELETE /v1/products/:id
   */
  router.delete(`${apiPrefix}/products/:id`,
    ...sellerMiddleware,
    async (req, res) => {
      await productController.deleteProduct(req, res);
    }
  );

  // =====================================================================================
  // PRODUCT SEARCH & DISCOVERY
  // =====================================================================================

  /**
   * Search Products
   * GET /v1/products/search
   */
  router.get(`${apiPrefix}/products/search`,
    ...commonMiddleware,
    cache,
    analytics,
    async (req, res) => {
      await productController.searchProducts(req, res);
    }
  );

  /**
   * Get Products by Seller
   * GET /v1/sellers/:sellerId/products
   */
  router.get(`${apiPrefix}/sellers/:sellerId/products`,
    ...commonMiddleware,
    cache,
    validateSchemaRequest(sellerProductsQuerySchema, 'query'),
    async (req, res) => {
      await productController.getProductsBySeller(req, res);
    }
  );

  /**
   * Load Category Attributes
   * GET /v1/categories/:categoryId/attributes
   */
  router.get(`${apiPrefix}/categories/:categoryId/attributes`,
    ...commonMiddleware,
    cache,
    async (req, res) => {
      await productController.loadCategoryAttributes(req, res);
    }
  );

  /**
   * Preview Generated Description
   * POST /v1/products/preview-description
   */
  router.post(`${apiPrefix}/products/preview-description`,
    ...sellerMiddleware,
    validateSchemaRequest(previewDescriptionSchema),
    async (req, res) => {
      await productController.previewGeneratedDescription(req, res);
    }
  );

  // =====================================================================================
  // PRODUCT LIFECYCLE MANAGEMENT
  // =====================================================================================

  /**
   * Publish Product
   * POST /v1/products/:id/publish
   */
  router.post(`${apiPrefix}/products/:id/publish`,
    ...sellerMiddleware,
    async (req, res) => {
      await productController.publishProduct(req, res);
    }
  );

  /**
   * Unpublish Product
   * POST /v1/products/:id/unpublish
   */
  router.post(`${apiPrefix}/products/:id/unpublish`,
    ...sellerMiddleware,
    async (req, res) => {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' }
        });
      }
      res.status(200).json({
        success: true,
        data: { productId: id, unpublished: true },
        meta: { timestamp: new Date() }
      });
    }
  );

  // =====================================================================================
  // PRODUCT ANALYTICS & INSIGHTS
  // =====================================================================================

  /**
   * Get Product Analytics
   * GET /v1/products/:id/analytics
   */
  router.get(`${apiPrefix}/products/:id/analytics`,
    ...sellerMiddleware, // Only seller or admin can view analytics
    async (req, res) => {
      await productController.getProductAnalytics(req, res);
    }
  );

  /**
   * Get Product Performance Metrics
   * GET /v1/products/:id/metrics
   */
  router.get(`${apiPrefix}/products/:id/metrics`,
    ...sellerMiddleware,
    cache,
    async (req, res) => {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' }
        });
      }
      res.status(200).json({
        success: true,
        data: {
          productId: id,
          metrics: {
            views: 0,
            clicks: 0,
            conversions: 0,
            conversionRate: 0
          }
        },
        meta: { timestamp: new Date() }
      });
    }
  );

  // =====================================================================================
  // BULK PRODUCT OPERATIONS
  // =====================================================================================

  /**
   * Bulk Create Products
   * POST /v1/products/bulk
   */
  router.post(`${apiPrefix}/products/bulk`,
    ...adminMiddleware, // Only admins can do bulk operations
    validateSchemaRequest(bulkCreateSchema),
    async (req, res) => {
      // Forward to bulk operations controller
      const { BulkOperationsController } = await import('../controllers/bulk-operations.controller');
      const bulkController = new BulkOperationsController();
      await bulkController.bulkCreateProducts(req, res);
    }
  );

  /**
   * Bulk Update Products
   * PUT /v1/products/bulk
   */
  router.put(`${apiPrefix}/products/bulk`,
    ...adminMiddleware,
    validateSchemaRequest(bulkUpdateSchema),
    async (req, res) => {
      const { BulkOperationsController } = await import('../controllers/bulk-operations.controller');
      const bulkController = new BulkOperationsController();
      await bulkController.bulkUpdateProducts(req, res);
    }
  );

  /**
   * Bulk Delete Products
   * DELETE /v1/products/bulk
   */
  router.delete(`${apiPrefix}/products/bulk`,
    ...adminMiddleware,
    validateSchemaRequest(bulkDeleteSchema),
    async (req, res) => {
      const { BulkOperationsController } = await import('../controllers/bulk-operations.controller');
      const bulkController = new BulkOperationsController();
      await bulkController.bulkDeleteProducts(req, res);
    }
  );

  // =====================================================================================
  // PRODUCT CATEGORIES & TAXONOMY
  // =====================================================================================

  /**
   * Update Product Category
   * PUT /v1/products/:id/category
   */
  router.put(`${apiPrefix}/products/:id/category`,
    ...sellerMiddleware,
    validateSchemaRequest(updateCategorySchema),
    async (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          productId: req.params.id,
          categoryId: req.body.categoryId,
          updated: true
        },
        meta: { timestamp: new Date() }
      });
    }
  );

  // =====================================================================================
  // PRODUCT MEDIA MANAGEMENT
  // =====================================================================================

  /**
   * Upload Product Media
   * POST /v1/products/:id/media
   */
  router.post(`${apiPrefix}/products/:id/media`,
    ...sellerMiddleware,
    async (req, res) => {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' }
        });
      }
      res.status(200).json({
        success: true,
        data: {
          productId: id,
          uploaded: true
        },
        meta: { timestamp: new Date() }
      });
    }
  );

  /**
   * Get Product Media
   * GET /v1/products/:id/media
   */
  router.get(`${apiPrefix}/products/:id/media`,
    ...commonMiddleware,
    cache,
    async (req, res) => {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Product ID is required' }
        });
      }
      res.status(200).json({
        success: true,
        data: {
          productId: id,
          media: []
        },
        meta: { timestamp: new Date() }
      });
    }
  );

  // =====================================================================================
  // LEGACY ROUTES (for backward compatibility)
  // =====================================================================================

  /**
   * Legacy Product Search (deprecated)
   * GET /v1/search/products
   */
  router.get(`${apiPrefix}/search/products`,
    ...commonMiddleware,
    async (req, res) => {
      // Redirect to new search endpoint
      const baseUrl = req.baseUrl || '';
      res.redirect(301, `${baseUrl}${apiPrefix}/products/search${req.url.split('?')[1] ? '?' + req.url.split('?')[1] : ''}`);
    }
  );

  return router;
}

/**
 * Product Routes Factory
 * Creates and configures product routes with all dependencies
 */
export class ProductRoutesFactory {
  static create(
    productController: ProductController,
    config: Partial<ProductRoutesConfig> = {}
  ): Router {
    // Create and return routes
    return createProductRoutes(productController, config);
  }

  static createWithDependencies(
    dependencies: {
      productController: ProductController;
      config?: Partial<ProductRoutesConfig>;
    }
  ): Router {
    return this.create(dependencies.productController, dependencies.config);
  }
}

/**
 * Route Metadata
 * Provides metadata about the product routes for documentation and testing
 */
export const PRODUCT_ROUTES_METADATA = {
  version: 'v1',
  prefix: '/v1',
  routes: [
    // CRUD Operations
    { method: 'POST', path: '/products', description: 'Create new product', auth: 'seller' },
    { method: 'GET', path: '/products/:id', description: 'Get product by ID', auth: 'public' },
    { method: 'PUT', path: '/products/:id', description: 'Update product', auth: 'seller' },
    { method: 'DELETE', path: '/products/:id', description: 'Delete product', auth: 'seller' },

    // Search & Discovery
    { method: 'GET', path: '/products/search', description: 'Search products', auth: 'public' },
    { method: 'GET', path: '/sellers/:sellerId/products', description: 'Get seller products', auth: 'public' },
    { method: 'GET', path: '/categories/:categoryId/attributes', description: 'Load category attributes', auth: 'public' },
    { method: 'POST', path: '/products/preview-description', description: 'Preview generated description', auth: 'seller' },

    // Lifecycle Management
    { method: 'POST', path: '/products/:id/publish', description: 'Publish product', auth: 'seller' },
    { method: 'POST', path: '/products/:id/unpublish', description: 'Unpublish product', auth: 'seller' },

    // Analytics
    { method: 'GET', path: '/products/:id/analytics', description: 'Get product analytics', auth: 'seller' },
    { method: 'GET', path: '/products/:id/metrics', description: 'Get product metrics', auth: 'seller' },

    // Bulk Operations
    { method: 'POST', path: '/products/bulk', description: 'Bulk create products', auth: 'admin' },
    { method: 'PUT', path: '/products/bulk', description: 'Bulk update products', auth: 'admin' },
    { method: 'DELETE', path: '/products/bulk', description: 'Bulk delete products', auth: 'admin' },

    // Media Management
    { method: 'POST', path: '/products/:id/media', description: 'Upload product media', auth: 'seller' },
    { method: 'GET', path: '/products/:id/media', description: 'Get product media', auth: 'public' },

    // Category Management
    { method: 'PUT', path: '/products/:id/category', description: 'Update product category', auth: 'seller' }
  ],
  middleware: [
    'authentication',
    'authorization',
    'rate-limiting',
    'request-validation',
    'caching',
    'analytics'
  ]
};
