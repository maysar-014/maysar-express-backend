/**
 * API Routes Index
 * Central export point for all route definitions
 * Provides factory functions for creating route handlers with proper middleware stacking
 */

export { createProductRoutes, ProductRoutesFactory, PRODUCT_ROUTES_METADATA } from './product.routes';
export { createPricingRoutes, PricingRoutesFactory, PRICING_ROUTES_METADATA } from './pricing.routes';
export { createSearchRoutes, SearchRoutesFactory, SEARCH_ROUTES_METADATA } from './search.routes';
export { createHealthRoutes, HealthRoutesFactory, HEALTH_ROUTES_METADATA } from './health.routes';

/**
 * Routes Dependencies Interface
 * Defines the structure of dependencies required by routes
 */
export interface RoutesDependencies {
  productController?: any;
  pricingController?: any;
  searchController?: any;
  bulkOperationsController?: any;
  config?: {
    apiVersion?: string;
    enableCaching?: boolean;
    enableAnalytics?: boolean;
    maxBulkUpdateSize?: number;
    maxSearchResults?: number;
    enableDetailedHealth?: boolean;
  };
}

/**
 * Default Routes Dependencies
 * Provides sensible defaults for route dependencies
 */
export const DEFAULT_ROUTES_DEPENDENCIES: RoutesDependencies = {
  config: {
    apiVersion: 'v1',
    enableCaching: true,
    enableAnalytics: true,
    maxBulkUpdateSize: 1000,
    maxSearchResults: 100,
    enableDetailedHealth: true
  }
};

/**
 * Create All Routes
 * Factory function to create all route handlers with shared dependencies
 */
export function createAllRoutes(dependencies: RoutesDependencies = {}): {
  product: any;
  pricing: any;
  search: any;
  health: any;
} {
  const deps = { ...DEFAULT_ROUTES_DEPENDENCIES, ...dependencies };

  // Import factories locally to avoid circular dependencies
  const { ProductRoutesFactory } = require('./product.routes');
  const { PricingRoutesFactory } = require('./pricing.routes');
  const { SearchRoutesFactory } = require('./search.routes');
  const { HealthRoutesFactory } = require('./health.routes');

  return {
    product: ProductRoutesFactory.create(deps.productController, deps.config),
    pricing: PricingRoutesFactory.create(deps.pricingController, deps.config),
    search: SearchRoutesFactory.create(deps.searchController, deps.config),
    health: HealthRoutesFactory.create(deps.config)
  };
}

/**
 * Routes Health Check
 * Utility function to verify all routes are properly configured
 */
export function verifyRoutesHealth(): {
  healthy: boolean;
  issues: string[];
  routes: string[];
} {
  const issues: string[] = [];
  const routes: string[] = [];

  try {
    // Check if route factories can be imported
    const { ProductRoutesFactory } = require('./product.routes');
    const { PricingRoutesFactory } = require('./pricing.routes');
    const { SearchRoutesFactory } = require('./search.routes');
    const { HealthRoutesFactory } = require('./health.routes');

    routes.push('ProductRoutes', 'PricingRoutes', 'SearchRoutes', 'HealthRoutes');

    // Test basic factory creation
    const healthRoutes = HealthRoutesFactory.create();
    if (!healthRoutes || typeof healthRoutes.get !== 'function') {
      issues.push('HealthRoutes factory not working correctly');
    }

  } catch (error) {
    issues.push(`Routes import/initialization error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    healthy: issues.length === 0,
    issues,
    routes
  };
}

/**
 * API Documentation Helper
 * Generates OpenAPI/Swagger compatible documentation
 */
export function generateApiDocumentation(): any {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Catalog Service API',
      version: '1.0.0',
      description: 'RESTful API for product catalog management'
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    paths: {
      // This would be generated from ROUTES_METADATA
      // For now, providing a basic structure
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  };
}
