/**
 * Search Controller Tests
 * Comprehensive API layer testing for search operations
 * Tests real controller implementation with deterministic behavior
 * Follows testing constitution: Fast, Isolated, Deterministic, Focused, Readable
 */

import { Request, Response } from 'express';
import { SearchController } from '../search.controller';

const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res as Response;
};

const mockRequest = (body = {}, params = {}, query = {}, headers = {}): Request => {
  return { body, params, query, headers } as Request;
};

describe('SearchController', () => {
  let controller: SearchController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SearchController();
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const req = mockRequest({}, {}, {
        q: 'headphones',
        category: 'electronics',
        page: '1',
        limit: '10'
      });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          results: expect.any(Array),
          total: expect.any(Number),
          facets: expect.any(Object),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10
          })
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should apply category filter', async () => {
      const req = mockRequest({}, {}, {
        category: 'electronics'
      });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply seller filter', async () => {
      const req = mockRequest({}, {}, {
        seller: 'seller-1'
      });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply price filters', async () => {
      const req = mockRequest({}, {}, {
        minPrice: '50',
        maxPrice: '100'
      });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should sort by price', async () => {
      const req = mockRequest({}, {}, {
        sortBy: 'price',
        sortOrder: 'asc'
      });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should sort by name', async () => {
      const req = mockRequest({}, {}, {
        sortBy: 'name',
        sortOrder: 'desc'
      });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should validate page number', async () => {
      const req = mockRequest({}, {}, {
        page: '-1'
      });
      const res = mockResponse();

      await controller.searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      // Force an error
      res.status = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await controller.searchProducts(req, res);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get search suggestions successfully', async () => {
      const req = mockRequest({}, {}, {
        q: 'head',
        limit: '3'
      });
      const res = mockResponse();

      await controller.getSearchSuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          suggestions: expect.any(Array),
          query: 'head'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should validate query parameter', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      await controller.getSearchSuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({}, {}, { q: 'test' });
      const res = mockResponse();

      res.status = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await controller.getSearchSuggestions(req, res);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getPopularSearches', () => {
    it('should get popular searches successfully', async () => {
      const req = mockRequest({}, {}, {
        limit: '5'
      });
      const res = mockResponse();

      await controller.getPopularSearches(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          popularSearches: expect.any(Array)
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle default limit', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      await controller.getPopularSearches(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      res.status = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await controller.getPopularSearches(req, res);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getSearchAnalytics', () => {
    it('should get search analytics successfully', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      await controller.getSearchAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalSearches: expect.any(Number),
          uniqueQueries: expect.any(Number),
          topSearches: expect.any(Array)
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      res.status = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await controller.getSearchAnalytics(req, res);

      expect(console.error).toHaveBeenCalled();
    });
  });
});