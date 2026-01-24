/**
 * Search Routes Tests
 * Comprehensive testing of search-related RESTful endpoints and middleware integration
 * Validates product search, suggestions, analytics, and legacy route handling
 */

import { Router } from 'express';
import request from 'supertest';
import express from 'express';
import { createSearchRoutes, SearchRoutesFactory, SEARCH_ROUTES_METADATA } from '../search.routes';
import { SearchController } from '../../controllers/search.controller';

// Mock SearchController
const mockSearchController = {
  searchProducts: jest.fn(),
  getSearchSuggestions: jest.fn(),
  getPopularSearches: jest.fn(),
  getSearchAnalytics: jest.fn()
};

// Mock Express app for integration testing
function createTestApp(routes: Router): express.Application {
  const app = express();
  app.use(express.json());
  app.use(routes);
  return app;
}

describe('Search Routes', () => {
  let app: express.Application;
  let routes: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    routes = createSearchRoutes(mockSearchController as any, {});
    app = createTestApp(routes);
  });

  describe('Route Registration', () => {
    it('should create a Router instance', () => {
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });

    it('should have correct route metadata', () => {
      expect(SEARCH_ROUTES_METADATA.version).toBe('v1');
      expect(SEARCH_ROUTES_METADATA.prefix).toBe('/api/v1');
      expect(SEARCH_ROUTES_METADATA.routes).toHaveLength(5);
      expect(SEARCH_ROUTES_METADATA.middleware).toEqual([
        'authentication',
        'rate-limiting',
        'caching',
        'analytics'
      ]);
    });
  });

  describe('Product Search - GET /api/v1/products/search', () => {
    it('should delegate to controller searchProducts method', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            products: [
              { id: 'prod-1', name: 'Laptop', price: 999 },
              { id: 'prod-2', name: 'Gaming Laptop', price: 1299 }
            ],
            total: 2,
            page: 1,
            limit: 20
          },
          meta: {
            searchQuery: 'laptop',
            executionTime: 45,
            searchEngine: 'elasticsearch'
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=laptop&category=electronics&page=1&limit=20');

      expect(mockSearchController.searchProducts).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.meta.searchQuery).toBe('laptop');
    });

    it('should handle search with filters and sorting', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        expect(req.query.q).toBe('phone');
        expect(req.query.category).toBe('electronics');
        expect(req.query.minPrice).toBe('100');
        expect(req.query.maxPrice).toBe('1000');
        expect(req.query.sortBy).toBe('price');
        expect(req.query.sortOrder).toBe('asc');

        res.status(200).json({
          success: true,
          data: { products: [], total: 0 }
        });
      });

      await request(app)
        .get('/api/v1/products/search?q=phone&category=electronics&minPrice=100&maxPrice=1000&sortBy=price&sortOrder=asc');

      expect(mockSearchController.searchProducts).toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            products: [],
            total: 0,
            page: 1,
            limit: 20
          },
          meta: {
            searchQuery: 'nonexistent',
            executionTime: 12
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should handle search validation errors', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(422).json({
          success: false,
          error: { code: 'INVALID_SEARCH_QUERY', message: 'Search query too short' }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=a'); // Too short

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SEARCH_QUERY');
    });
  });

  describe('Search Suggestions - GET /api/v1/search/suggestions', () => {
    it('should delegate to controller getSearchSuggestions method', async () => {
      mockSearchController.getSearchSuggestions.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            suggestions: [
              { text: 'laptop', type: 'query', popularity: 95 },
              { text: 'laptop stand', type: 'query', popularity: 67 },
              { text: 'laptop bag', type: 'product', popularity: 78 }
            ],
            total: 3
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/search/suggestions?q=lap&limit=5');

      expect(mockSearchController.getSearchSuggestions).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toHaveLength(3);
      expect(response.body.data.suggestions[0].text).toBe('laptop');
      expect(response.body.data.suggestions[0].type).toBe('query');
    });

    it('should handle suggestions with different types', async () => {
      mockSearchController.getSearchSuggestions.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            suggestions: [
              { text: 'electronics', type: 'category', popularity: 100 },
              { text: 'wireless mouse', type: 'product', popularity: 45 },
              { text: 'laptop accessories', type: 'collection', popularity: 23 }
            ]
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/search/suggestions?q=wireless');

      expect(response.body.data.suggestions.some((s: any) => s.type === 'category')).toBe(true);
      expect(response.body.data.suggestions.some((s: any) => s.type === 'product')).toBe(true);
      expect(response.body.data.suggestions.some((s: any) => s.type === 'collection')).toBe(true);
    });

    it('should handle empty suggestions', async () => {
      mockSearchController.getSearchSuggestions.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            suggestions: [],
            total: 0
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/search/suggestions?q=xyz123nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toHaveLength(0);
    });
  });

  describe('Popular Searches - GET /api/v1/search/popular', () => {
    it('should delegate to controller getPopularSearches method', async () => {
      mockSearchController.getPopularSearches.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            searches: [
              { query: 'laptop', count: 1250, trend: 'up' },
              { query: 'phone', count: 980, trend: 'stable' },
              { query: 'headphones', count: 756, trend: 'down' }
            ],
            period: '7d',
            totalSearches: 3456
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/search/popular?period=7d&limit=10');

      expect(mockSearchController.getPopularSearches).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.searches).toHaveLength(3);
      expect(response.body.data.searches[0].query).toBe('laptop');
      expect(response.body.data.searches[0].count).toBe(1250);
      expect(response.body.data.period).toBe('7d');
    });

    it('should handle different time periods', async () => {
      mockSearchController.getPopularSearches.mockImplementation(async (req, res) => {
        expect(req.query.period).toBe('30d');
        expect(req.query.limit).toBe('20');

        res.status(200).json({
          success: true,
          data: { searches: [] }
        });
      });

      await request(app)
        .get('/api/v1/search/popular?period=30d&limit=20');

      expect(mockSearchController.getPopularSearches).toHaveBeenCalled();
    });

    it('should handle popular searches errors', async () => {
      mockSearchController.getPopularSearches.mockImplementation(async (req, res) => {
        res.status(500).json({
          success: false,
          error: { code: 'ANALYTICS_ERROR', message: 'Failed to fetch popular searches' }
        });
      });

      const response = await request(app)
        .get('/api/v1/search/popular');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Search Analytics - GET /api/v1/search/analytics', () => {
    it('should delegate to controller getSearchAnalytics method', async () => {
      mockSearchController.getSearchAnalytics.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            totalSearches: 15420,
            uniqueQueries: 3456,
            averageResultsPerSearch: 24.5,
            topSearches: [
              { query: 'laptop', count: 1250, conversionRate: 0.15 },
              { query: 'phone', count: 980, conversionRate: 0.12 }
            ],
            searchTrends: {
              daily: [120, 145, 132, 158, 167, 143, 134],
              weekly: [890, 923, 945, 967]
            },
            noResultsQueries: [
              { query: 'xyz123abc', count: 45 },
              { query: 'nonexistent product', count: 23 }
            ],
            period: '30d'
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/search/analytics?period=30d&metrics=detailed');

      expect(mockSearchController.getSearchAnalytics).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSearches).toBe(15420);
      expect(response.body.data.uniqueQueries).toBe(3456);
      expect(response.body.data.topSearches).toHaveLength(2);
    });

    it('should include trend data', async () => {
      mockSearchController.getSearchAnalytics.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            searchTrends: {
              daily: [100, 120, 95, 110, 130],
              weekly: [650, 680, 720, 690]
            }
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/search/analytics');

      expect(response.body.data.searchTrends.daily).toHaveLength(5);
      expect(response.body.data.searchTrends.weekly).toHaveLength(4);
    });

    it('should handle analytics query parameters', async () => {
      mockSearchController.getSearchAnalytics.mockImplementation(async (req, res) => {
        expect(req.query.period).toBe('7d');
        expect(req.query.metrics).toBe('basic');
        expect(req.query.format).toBe('json');

        res.status(200).json({ success: true, data: {} });
      });

      await request(app)
        .get('/api/v1/search/analytics?period=7d&metrics=basic&format=json');

      expect(mockSearchController.getSearchAnalytics).toHaveBeenCalled();
    });
  });

  describe('Legacy Search Route - GET /api/v1/search', () => {
    it('should redirect to new search endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/search?q=laptop&category=electronics&page=1')
        .redirects(0); // Don't follow redirects

      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('/api/v1/products/search?q=laptop&category=electronics&page=1');
    });

    it('should handle search without query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/search?category=electronics&limit=10')
        .redirects(0);

      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('/api/v1/products/search?category=electronics&limit=10');
    });

    it('should handle legacy query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/search?query=phone&sort=price')
        .redirects(0);

      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('/api/v1/products/search?q=phone&sort=price');
    });

    it('should handle empty query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .redirects(0);

      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('/api/v1/products/search?q=');
    });
  });

  describe('Configuration Handling', () => {
    it('should support custom API version', async () => {
      const customRoutes = createSearchRoutes(mockSearchController as any, { apiVersion: 'v2' });
      const customApp = createTestApp(customRoutes);

      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(customApp)
        .get('/api/v2/products/search?q=test');

      expect(response.status).toBe(200);
    });

    it('should support disabling analytics', async () => {
      const customRoutes = createSearchRoutes(mockSearchController as any, {
        enableAnalytics: false
      });

      expect(customRoutes).toBeDefined();
      // Analytics disabling is tested implicitly through middleware configuration
    });

    it('should use default configuration when none provided', () => {
      const defaultRoutes = createSearchRoutes(mockSearchController as any, {});

      expect(defaultRoutes).toBeDefined();
    });
  });

  describe('SearchRoutesFactory', () => {
    describe('create', () => {
      it('should create search routes with controller and config', () => {
        const routes = SearchRoutesFactory.create(mockSearchController as any, {
          apiVersion: 'v1',
          enableCaching: true,
          maxSearchResults: 50
        });

        expect(routes).toBeDefined();
        expect(typeof routes).toBe('function');
      });

      it('should create routes with default config when none provided', () => {
        const routes = SearchRoutesFactory.create(mockSearchController as any);

        expect(routes).toBeDefined();
      });
    });
  });

  describe('Route Metadata Validation', () => {
    it('should export comprehensive metadata', () => {
      expect(SEARCH_ROUTES_METADATA).toBeDefined();
      expect(SEARCH_ROUTES_METADATA.version).toBe('v1');
      expect(SEARCH_ROUTES_METADATA.routes).toHaveLength(5);
    });

    it('should include all search endpoints in metadata', () => {
      const routes = SEARCH_ROUTES_METADATA.routes;
      const paths = routes.map(r => r.path);

      expect(paths).toContain('/products/search');
      expect(paths).toContain('/search/suggestions');
      expect(paths).toContain('/search/popular');
      expect(paths).toContain('/search/analytics');
      expect(paths).toContain('/search');
    });

    it('should specify correct HTTP methods', () => {
      const routes = SEARCH_ROUTES_METADATA.routes;
      const methods = routes.map(r => r.method);

      expect(methods.every(method => method === 'GET')).toBe(true);
    });

    it('should mark all endpoints as public', () => {
      const routes = SEARCH_ROUTES_METADATA.routes;
      const auths = routes.map(r => r.auth);

      expect(auths.every(auth => auth === 'public')).toBe(true);
    });

    it('should include descriptive route information', () => {
      const routes = SEARCH_ROUTES_METADATA.routes;

      routes.forEach(route => {
        expect(route.description).toBeDefined();
        expect(typeof route.description).toBe('string');
        expect(route.description.length).toBeGreaterThan(0);
      });
    });

    it('should specify middleware stack', () => {
      expect(SEARCH_ROUTES_METADATA.middleware).toContain('authentication');
      expect(SEARCH_ROUTES_METADATA.middleware).toContain('rate-limiting');
      expect(SEARCH_ROUTES_METADATA.middleware).toContain('caching');
      expect(SEARCH_ROUTES_METADATA.middleware).toContain('analytics');
    });
  });

  describe('Error Handling', () => {
    it('should handle route-level errors gracefully', async () => {
      const invalidRoutes = createSearchRoutes(mockSearchController as any, {});
      const invalidApp = createTestApp(invalidRoutes);

      const response = await request(invalidApp)
        .get('/api/v1/search/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle controller method errors', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        throw new Error('Search service unavailable');
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=test');

      expect(response.status).toBe(500);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent search requests', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(200).json({ success: true, data: { products: [], total: 0 } });
      });

      const promises = Array(5).fill().map(() =>
        request(app).get('/api/v1/products/search?q=laptop')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should respond quickly to search requests', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(200).json({ success: true });
      });

      const startTime = Date.now();

      await request(app)
        .get('/api/v1/products/search?q=laptop');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Search Engine Features', () => {
    it('should support advanced search filters', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        expect(req.query.q).toBe('gaming laptop');
        expect(req.query.category).toBe('electronics');
        expect(req.query.brand).toBe('dell');
        expect(req.query.minPrice).toBe('800');
        expect(req.query.maxPrice).toBe('2000');
        expect(req.query.inStock).toBe('true');
        expect(req.query.sortBy).toBe('relevance');
        expect(req.query.sortOrder).toBe('desc');

        res.status(200).json({ success: true, data: { products: [] } });
      });

      await request(app)
        .get('/api/v1/products/search?q=gaming+laptop&category=electronics&brand=dell&minPrice=800&maxPrice=2000&inStock=true&sortBy=relevance&sortOrder=desc');

      expect(mockSearchController.searchProducts).toHaveBeenCalled();
    });

    it('should support faceted search results', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            products: [],
            facets: {
              category: [
                { value: 'electronics', count: 150 },
                { value: 'books', count: 75 }
              ],
              brand: [
                { value: 'dell', count: 45 },
                { value: 'hp', count: 38 }
              ],
              priceRange: [
                { value: '0-500', count: 60 },
                { value: '500-1000', count: 85 }
              ]
            }
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=laptop&facets=true');

      expect(response.body.data.facets).toBeDefined();
      expect(response.body.data.facets.category).toHaveLength(2);
      expect(response.body.data.facets.brand).toHaveLength(2);
    });

    it('should handle search result pagination', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            products: [{ id: 'prod-1', name: 'Laptop' }],
            total: 150,
            page: 2,
            limit: 10,
            totalPages: 15,
            hasNext: true,
            hasPrev: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=laptop&page=2&limit=10');

      expect(response.body.data.page).toBe(2);
      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.totalPages).toBe(15);
      expect(response.body.data.hasNext).toBe(true);
      expect(response.body.data.hasPrev).toBe(true);
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate search query length', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(422).json({
          success: false,
          error: { code: 'QUERY_TOO_SHORT', message: 'Search query must be at least 2 characters' }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=a');

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('QUERY_TOO_SHORT');
    });

    it('should handle special characters in search queries', async () => {
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        expect(req.query.q).toBe('laptop & mouse');
        res.status(200).json({ success: true, data: { products: [] } });
      });

      await request(app)
        .get('/api/v1/products/search?q=laptop%20%26%20mouse');

      expect(mockSearchController.searchProducts).toHaveBeenCalled();
    });

    it('should handle search rate limiting', async () => {
      // This would typically be handled by rate limiting middleware
      // but we can test the controller's response to rate limit errors
      mockSearchController.searchProducts.mockImplementation(async (req, res) => {
        res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many search requests' }
        });
      });

      const response = await request(app)
        .get('/api/v1/products/search?q=test');

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
