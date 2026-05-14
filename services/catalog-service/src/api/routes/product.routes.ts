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
import { requireKycLevel } from '../../../../kyc-service/src/api/middleware/kyc-gate.middleware';
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
  const createProductSchema = z.object({
    sellerId: nonEmptyString,
    categoryId: nonEmptyString,
    brand: nonEmptyString,
    productName: nonEmptyString,
    minimumOrderQuantity: z.number().positive(),
    supplierLocationId: nonEmptyString,
    supplierLocation: nonEmptyString.optional(),
    structuredAttributes: z.record(nonEmptyString),
    mediaUrls: z.array(nonEmptyString).min(1),
    price: z.number().positive(),
    currency: nonEmptyString.optional(),
    seoKeywordsOverride: z.array(nonEmptyString).optional(),
    inventoryCount: z.number().int().min(0).optional(),
    enablerEnabled: z.boolean().optional(),
    enablerCommissionRate: z.number().gt(0).lte(1).optional(),
    codAccepted: z.boolean().optional(),
    freeDelivery: z.boolean().optional(),
    condition: z.enum(['new', 'used', 'refurbished', 'damaged']).optional()
  }).strict().superRefine((body, ctx) => {
    if (body.enablerEnabled && body.enablerCommissionRate === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['enablerCommissionRate'],
        message: 'Enabler commission rate is required when enabler is enabled'
      });
    }
  });
  const nullableNonEmptyString = z.union([nonEmptyString, z.null()]);
  const createCategorySchema = z.object({
    label: nonEmptyString,
    icon: nullableNonEmptyString.optional(),
    description: z.union([z.string(), z.null()]).optional(),
    parentId: nullableNonEmptyString.optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    slug: nonEmptyString.optional()
  }).strict();
  const updateCategorySchema = z.object({
    label: nonEmptyString.optional(),
    icon: nullableNonEmptyString.optional(),
    description: z.union([z.string(), z.null()]).optional(),
    parentId: nullableNonEmptyString.optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    slug: nonEmptyString.optional()
  }).strict().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'Request body required' }
  );
  const updateProductSchema = z.object({
    name: nonEmptyString.optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    currency: nonEmptyString.optional(),
    categoryId: nonEmptyString.optional(),
    supplierLocation: nonEmptyString.optional(),
    tags: z.array(z.string()).optional(),
    attributes: z.record(z.any()).optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    enablerEnabled: z.boolean().optional(),
    enablerCommissionRate: z.number().gt(0).lte(1).optional(),
    codAccepted: z.boolean().optional(),
    freeDelivery: z.boolean().optional(),
    condition: z.enum(['new', 'used', 'refurbished', 'damaged']).optional()
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
  const updateProductCategorySchema = z.object({
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
    requireRole(['seller', 'supplier', 'admin']),
    requireKycLevel(1), // Sellers and suppliers must have basic identity verification to list products
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
    validateSchemaRequest(createProductSchema),
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
   * List Categories
   * GET /v1/categories
   */
  router.get(`${apiPrefix}/categories`,
    ...commonMiddleware,
    cache,
    async (req, res) => {
      await productController.listCategories(req, res);
    }
  );

  /**
   * Create Category
   * POST /v1/categories
   */
  router.post(`${apiPrefix}/categories`,
    ...adminMiddleware,
    validateSchemaRequest(createCategorySchema),
    async (req, res) => {
      await productController.createCategory(req, res);
    }
  );

  /**
   * Update Category
   * PUT /v1/categories/:id
   */
  router.put(`${apiPrefix}/categories/:id`,
    ...adminMiddleware,
    validateSchemaRequest(updateCategorySchema),
    async (req, res) => {
      await productController.updateCategory(req, res);
    }
  );

  /**
   * Delete Category
   * DELETE /v1/categories/:id
   */
  router.delete(`${apiPrefix}/categories/:id`,
    ...adminMiddleware,
    async (req, res) => {
      await productController.deleteCategory(req, res);
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
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Product unpublish is not implemented yet'
        }
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
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Product metrics are not implemented yet'
        }
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
    validateSchemaRequest(updateProductCategorySchema),
    async (req, res) => {
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Product category updates are not implemented yet'
        }
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
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Product media upload is not implemented yet'
        }
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
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Product media listing is not implemented yet'
        }
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
    { method: 'GET', path: '/categories', description: 'List categories', auth: 'public' },
    { method: 'POST', path: '/categories', description: 'Create category', auth: 'admin' },
    { method: 'PUT', path: '/categories/:id', description: 'Update category', auth: 'admin' },
    { method: 'DELETE', path: '/categories/:id', description: 'Delete category', auth: 'admin' },
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
