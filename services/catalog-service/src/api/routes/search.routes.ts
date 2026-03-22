/**
 * Search Routes
 * RESTful route definitions for product search operations
 * Implements API versioning and middleware stacking
 */

import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

/**
 * Search Routes Configuration
 */
export interface SearchRoutesConfig {
  apiVersion: string;
  enableCaching: boolean;
  enableAnalytics: boolean;
  maxSearchResults: number;
}

/**
 * Default Search Routes Configuration
 */
export const DEFAULT_SEARCH_ROUTES_CONFIG: SearchRoutesConfig = {
  apiVersion: 'v1',
  enableCaching: true,
  enableAnalytics: true,
  maxSearchResults: 100
};

/**
 * Create Search Routes
 * Factory function for creating search route handlers
 */
export function createSearchRoutes(
  searchController: SearchController,
  config: Partial<SearchRoutesConfig> = {}
): Router {
  const router = Router();
  const routesConfig = { ...DEFAULT_SEARCH_ROUTES_CONFIG, ...config };
  const apiPrefix = `/${routesConfig.apiVersion}`;

  // Middleware placeholders
  const authenticate = (req: any, res: any, next: any) => next();
  const rateLimit = (req: any, res: any, next: any) => next();
  const cache = (req: any, res: any, next: any) => next();
  const analytics = (req: any, res: any, next: any) => next();

  const commonMiddleware = [authenticate, rateLimit];
  if (routesConfig.enableAnalytics) {
    commonMiddleware.push(analytics);
  }

  // =====================================================================================
  // PRODUCT SEARCH
  // =====================================================================================

  /**
   * Search Products
   * GET /v1/products/search
   */
  router.get(`${apiPrefix}/products/search`,
    ...commonMiddleware,
    cache,
    async (req, res) => {
      await searchController.searchProducts(req, res);
    }
  );

  // =====================================================================================
  // SEARCH SUGGESTIONS & AUTOCOMPLETE
  // =====================================================================================

  /**
   * Get Search Suggestions
   * GET /v1/search/suggestions
   */
  router.get(`${apiPrefix}/search/suggestions`,
    ...commonMiddleware,
    cache,
    async (req, res) => {
      await searchController.getSearchSuggestions(req, res);
    }
  );

  // =====================================================================================
  // SEARCH ANALYTICS & INSIGHTS
  // =====================================================================================

  /**
   * Get Popular Searches
   * GET /v1/search/popular
   */
  router.get(`${apiPrefix}/search/popular`,
    ...commonMiddleware,
    cache,
    async (req, res) => {
      await searchController.getPopularSearches(req, res);
    }
  );

  /**
   * Get Search Analytics
   * GET /v1/search/analytics
   */
  router.get(`${apiPrefix}/search/analytics`,
    commonMiddleware[0], // authenticate only for analytics
    cache,
    async (req, res) => {
      await searchController.getSearchAnalytics(req, res);
    }
  );

  // =====================================================================================
  // LEGACY SEARCH ROUTES
  // =====================================================================================

  /**
   * Legacy Search Endpoint (deprecated)
   * GET /v1/search
   */
  router.get(`${apiPrefix}/search`,
    ...commonMiddleware,
    async (req, res) => {
      // Redirect to new search endpoint
      const query = req.query.q || req.query.query || '';
      const params = new URLSearchParams(req.url.split('?')[1]);
      params.set('q', query as string);

      const baseUrl = req.baseUrl || '';
      res.redirect(301, `${baseUrl}${apiPrefix}/products/search?${params.toString()}`);
    }
  );

  return router;
}

/**
 * Search Routes Factory
 */
export class SearchRoutesFactory {
  static create(
    searchController: SearchController,
    config: Partial<SearchRoutesConfig> = {}
  ): Router {
    return createSearchRoutes(searchController, config);
  }
}

/**
 * Route Metadata
 */
export const SEARCH_ROUTES_METADATA = {
  version: 'v1',
  prefix: '/v1',
  routes: [
    { method: 'GET', path: '/products/search', description: 'Search products with filters', auth: 'public' },
    { method: 'GET', path: '/search/suggestions', description: 'Get search suggestions', auth: 'public' },
    { method: 'GET', path: '/search/popular', description: 'Get popular searches', auth: 'public' },
    { method: 'GET', path: '/search/analytics', description: 'Get search analytics', auth: 'public' },
    { method: 'GET', path: '/search', description: 'Legacy search endpoint (deprecated)', auth: 'public' }
  ],
  middleware: [
    'authentication',
    'rate-limiting',
    'caching',
    'analytics'
  ]
};
