/**
 * Search Controller Test Suite
 * Tests for search controller functionality
 */

import { Request, Response } from 'express';
import { SearchController } from '../search.controller';

describe('SearchController', () => {
  let controller: SearchController;

  const createMockResponse = (): Partial<Response> => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  });

  beforeEach(() => {
    controller = new SearchController();
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const mockRequest = {
        query: { q: 'laptop' }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            query: 'laptop',
            products: [],
            total: 0,
            page: 1,
            limit: 20
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should trim whitespace from the search query', async () => {
      const mockRequest = {
        query: { q: '  laptop  ' }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            query: 'laptop'
          })
        })
      );
    });

    it('should handle missing search query as empty search', async () => {
      const mockRequest = {
        query: {}
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            query: '',
            products: [],
            total: 0
          })
        })
      );
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get search suggestions successfully', async () => {
      const mockRequest = {
        query: { q: 'wireless' }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            query: 'wireless',
            suggestions: [
              expect.objectContaining({ text: 'wireless', type: 'query' }),
              expect.objectContaining({ text: 'wireless deals', type: 'related' }),
              expect.objectContaining({ text: 'wireless near me', type: 'related' })
            ]
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should return empty suggestions for missing query', async () => {
      const mockRequest = {
        query: {}
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            query: '',
            suggestions: []
          }
        })
      );
    });

    it('should return empty suggestions for blank query', async () => {
      const mockRequest = {
        query: { q: '   ' }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            query: '',
            suggestions: []
          }
        })
      );
    });
  });

  describe('getPopularSearches', () => {
    it('should get popular searches successfully', async () => {
      const mockRequest = {
        query: { limit: '5' }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getPopularSearches(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            items: []
          }
        })
      );
    });

    it('should return the default popular search payload', async () => {
      const mockRequest = {
        query: {}
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getPopularSearches(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            items: []
          }
        })
      );
    });
  });

  describe('getSearchAnalytics', () => {
    it('should get search analytics successfully', async () => {
      const mockRequest = {} as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getSearchAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            totalSearches: 0,
            topQueries: []
          }
        })
      );
    });
  });
});
