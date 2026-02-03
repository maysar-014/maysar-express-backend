/**
 * Bulk Operations Controller Test Suite
 * Tests for bulk operations controller functionality
 */

import { Request, Response } from 'express';
import { BulkOperationsController } from '../bulk-operations.controller';

describe('BulkOperationsController', () => {
  let controller: BulkOperationsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    controller = new BulkOperationsController();
    
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

  describe('bulkCreateProducts', () => {
    it('should create bulk products successfully', async () => {
      const productsData = [
        { name: 'Product 1', price: 100 },
        { name: 'Product 2', price: 200 }
      ];

      mockRequest.body = { products: productsData };

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequested: 2,
            successful: 2,
            failed: 0
          })
        })
      );
    });

    it('should handle missing products in request body', async () => {
      mockRequest.body = {};

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

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

    it('should handle empty products array', async () => {
      mockRequest.body = { products: [] };

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

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

    it('should handle too many products', async () => {
      const productsData = Array(101).fill({ name: 'Product', price: 100 });

      mockRequest.body = { products: productsData };

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

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

    it('should handle missing request body', async () => {
      mockRequest.body = undefined;

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

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

  describe('bulkUpdateProducts', () => {
    it('should update bulk products successfully', async () => {
      const productIds = ['1', '2', '3'];
      const updates = { status: 'active', price: 150 };

      mockRequest.body = { productIds, updates };

      await controller.bulkUpdateProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequested: 3,
            successful: 3,
            failed: 0
          })
        })
      );
    });

    it('should handle missing productIds', async () => {
      mockRequest.body = { updates: { status: 'active' } };

      await controller.bulkUpdateProducts(mockRequest as Request, mockResponse as Response);

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

    it('should handle missing updates', async () => {
      mockRequest.body = { productIds: ['1', '2'] };

      await controller.bulkUpdateProducts(mockRequest as Request, mockResponse as Response);

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

    it('should handle too many productIds', async () => {
      const productIds = Array(501).fill('product-id');

      mockRequest.body = { productIds, updates: { status: 'active' } };

      await controller.bulkUpdateProducts(mockRequest as Request, mockResponse as Response);

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

  describe('bulkDeleteProducts', () => {
    it('should delete bulk products successfully', async () => {
      const productIds = ['1', '2', '3'];

      mockRequest.body = { productIds };

      await controller.bulkDeleteProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequested: 3,
            successful: 3,
            failed: 0
          })
        })
      );
    });

    it('should handle missing productIds', async () => {
      mockRequest.body = {};

      await controller.bulkDeleteProducts(mockRequest as Request, mockResponse as Response);

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

    it('should handle too many productIds', async () => {
      const productIds = Array(101).fill('product-id');

      mockRequest.body = { productIds };

      await controller.bulkDeleteProducts(mockRequest as Request, mockResponse as Response);

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

  describe('bulkPublishProducts', () => {
    it('should publish bulk products successfully', async () => {
      const productIds = ['1', '2', '3'];

      mockRequest.body = { productIds };

      await controller.bulkPublishProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequested: 3,
            successful: 3,
            failed: 0
          })
        })
      );
    });

    it('should handle too many productIds', async () => {
      const productIds = Array(201).fill('product-id');

      mockRequest.body = { productIds };

      await controller.bulkPublishProducts(mockRequest as Request, mockResponse as Response);

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

  describe('bulkUnpublishProducts', () => {
    it('should unpublish bulk products successfully', async () => {
      const productIds = ['1', '2', '3'];

      mockRequest.body = { productIds };

      await controller.bulkUnpublishProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequested: 3,
            successful: 3,
            failed: 0
          })
        })
      );
    });
  });

  describe('bulkUpdateCategories', () => {
    it('should update bulk categories successfully', async () => {
      const productIds = ['1', '2', '3'];
      const newCategoryId = 'new-category-id';

      mockRequest.body = { productIds, newCategoryId };

      await controller.bulkUpdateCategories(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRequested: 3,
            successful: 3,
            failed: 0
          })
        })
      );
    });

    it('should handle missing newCategoryId', async () => {
      const productIds = ['1', '2', '3'];

      mockRequest.body = { productIds };

      await controller.bulkUpdateCategories(mockRequest as Request, mockResponse as Response);

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

  describe('getBulkOperationStatus', () => {
    it('should get bulk operation status successfully', async () => {
      mockRequest.params = { operationId: 'bulk-update-123' };

      await controller.getBulkOperationStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            operationId: 'bulk-update-123'
          })
        })
      );
    });

    it('should handle missing operationId', async () => {
      mockRequest.params = {};

      await controller.getBulkOperationStatus(mockRequest as Request, mockResponse as Response);

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

  describe('getBulkOperationsHistory', () => {
    it('should get bulk operations history successfully', async () => {
      mockRequest.query = { limit: '10', offset: '0' };

      await controller.getBulkOperationsHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            operations: expect.any(Array)
          })
        })
      );
    });

    it('should handle filtering by type', async () => {
      mockRequest.query = { type: 'bulk_update', limit: '10', offset: '0' };

      await controller.getBulkOperationsHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            operations: expect.any(Array)
          })
        })
      );
    });

    it('should handle filtering by status', async () => {
      mockRequest.query = { status: 'completed', limit: '10', offset: '0' };

      await controller.getBulkOperationsHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            operations: expect.any(Array)
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
      mockRequest.body = { products: null };

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

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
      const productsData = [{ name: 'Product 1', price: 100 }];

      mockRequest.body = { products: productsData };

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

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
      mockRequest.body = {};

      await controller.bulkCreateProducts(mockRequest as Request, mockResponse as Response);

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