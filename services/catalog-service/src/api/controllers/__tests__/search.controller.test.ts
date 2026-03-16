/**
 * Search Controller Test Suite
 * Tests for search controller functionality
 */

import { Request, Response } from 'express';
import { SearchController } from '../search.controller';

describe('SearchController', () => {
  let controller: SearchController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    controller = new SearchController();
    
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const searchQuery = 'laptop';
      const filters = { category: 'electronics', priceRange: { min: 500, max: 2000 } };
      const options = { limit: 10, offset: 0, sortBy: 'relevance' };

      mockRequest.query = { q: searchQuery, filters: JSON.stringify(filters), options: JSON.stringify(options) };

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            query: searchQuery,
            results: expect.any(Array),
            total: expect.any(Number),
            facets: expect.any(Object)
          })
        })
      );
    });

    it('should handle missing search query', async () => {
      mockRequest.query = {};

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should handle invalid filters', async () => {
      const searchQuery = 'laptop';
      const invalidFilters = 'invalid-json';

      mockRequest.query = { q: searchQuery, filters: invalidFilters };

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should handle invalid options', async () => {
      const searchQuery = 'laptop';
      const options = 'invalid-json';

      mockRequest.query = { q: searchQuery, options };

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get search suggestions successfully', async () => {
      const query = 'wireless';

      mockRequest.query = { q: query };

      await controller.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            suggestions: expect.any(Array),
            query
          })
        })
      );
    });

    it('should handle missing query', async () => {
      mockRequest.query = {};

      await controller.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should handle empty query', async () => {
      mockRequest.query = { q: '' };

      await controller.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });
  });

  describe('getPopularSearches', () => {
    it('should get popular searches successfully', async () => {
      const limit = '5';

      mockRequest.query = { limit };

      await controller.getPopularSearches(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            popularSearches: expect.any(Array)
          })
        })
      );
    });

    it('should handle default limit', async () => {
      mockRequest.query = {};

      await controller.getPopularSearches(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            popularSearches: expect.any(Array)
          })
        })
      );
    });
  });

  describe('getSearchAnalytics', () => {
    it('should get search analytics successfully', async () => {
      await controller.getSearchAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalSearches: expect.any(Number),
            uniqueQueries: expect.any(Number),
            averageResultsPerSearch: expect.any(Number),
            conversionRate: expect.any(Number),
            topSearches: expect.any(Array),
            noResultsRate: expect.any(Number),
            period: expect.any(Object)
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle internal errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock a scenario that would cause an internal error
      mockRequest.query = { q: 'invalid-query' };

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          })
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('response formatting', () => {
    it('should return consistent response format for success', async () => {
      const searchQuery = 'laptop';

      mockRequest.query = { q: searchQuery };

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should return consistent response format for errors', async () => {
      mockRequest.query = {};

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String)
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });
  });
});
