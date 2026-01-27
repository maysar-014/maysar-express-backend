/**
 * Pricing Controller Test Suite
 * Tests for pricing controller functionality
 */

import { Request, Response } from 'express';
import { PricingController } from '../pricing.controller';

describe('PricingController', () => {
  let controller: PricingController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    controller = new PricingController();
    
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

  describe('calculatePrice', () => {
    it('should calculate price successfully', async () => {
      const productId = 'product-123';
      const basePrice = 100;
      const pricingRules = [
        { type: 'percentage_discount', value: 10, id: 'rule-1' }
      ];

      mockRequest.body = { productId, basePrice, pricingRules };

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            productId,
            basePrice,
            finalPrice: expect.any(Number),
            currency: 'USD'
          })
        })
      );
    });

    it('should handle missing product ID', async () => {
      mockRequest.body = { basePrice: 100 };

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

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

    it('should handle invalid base price', async () => {
      mockRequest.body = { productId: 'product-123', basePrice: -10 };

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

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

  describe('updateProductPrice', () => {
    it('should update product price successfully', async () => {
      const productId = 'product-123';
      const pricingStrategy = 'fixed';
      const pricingValue = 99.99;

      mockRequest.params = { productId };
      mockRequest.body = { pricingStrategy, pricingValue };

      await controller.updateProductPrice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            productId,
            success: true,
            newPrice: expect.objectContaining({
              amount: expect.any(Number),
              currency: expect.any(String)
            })
          })
        })
      );
    });

    it('should handle missing product ID', async () => {
      mockRequest.params = {};
      mockRequest.body = { pricingStrategy: 'fixed', pricingValue: 99.99 };

      await controller.updateProductPrice(mockRequest as Request, mockResponse as Response);

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

    it('should handle invalid pricing strategy', async () => {
      const productId = 'product-123';

      mockRequest.params = { productId };
      mockRequest.body = { pricingStrategy: 'invalid', pricingValue: 99.99 };

      await controller.updateProductPrice(mockRequest as Request, mockResponse as Response);

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

  describe('bulkUpdatePricing', () => {
    it('should bulk update pricing successfully', async () => {
      const productIds = ['product-1', 'product-2', 'product-3'];
      const pricingStrategy = 'fixed';
      const pricingValue = 89.99;

      mockRequest.body = { productIds, pricingStrategy, pricingValue };

      await controller.bulkUpdatePricing(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalProducts: 3,
            successfulUpdates: 3,
            failedUpdates: 0,
            pricingStrategy,
            pricingValue
          })
        })
      );
    });

    it('should handle missing product IDs', async () => {
      mockRequest.body = { pricingStrategy: 'fixed', pricingValue: 89.99 };

      await controller.bulkUpdatePricing(mockRequest as Request, mockResponse as Response);

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

    it('should handle invalid pricing strategy', async () => {
      const productIds = ['product-1', 'product-2'];

      mockRequest.body = { productIds, pricingStrategy: 'invalid', pricingValue: 89.99 };

      await controller.bulkUpdatePricing(mockRequest as Request, mockResponse as Response);

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

  describe('getPricingRules', () => {
    it('should get pricing rules successfully', async () => {
      await controller.getPricingRules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );
    });
  });

  describe('createPricingRule', () => {
    it('should create pricing rule successfully', async () => {
      const ruleData = {
        name: 'Test Discount',
        ruleType: 'percentage_discount',
        value: 10,
        priority: 1
      };

      mockRequest.body = ruleData;

      await controller.createPricingRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            ruleId: expect.any(String),
            ruleType: 'percentage_discount',
            name: 'Test Discount',
            value: 10,
            isActive: true
          })
        })
      );
    });

    it('should handle missing rule name', async () => {
      mockRequest.body = { ruleType: 'percentage_discount', value: 10 };

      await controller.createPricingRule(mockRequest as Request, mockResponse as Response);

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

    it('should handle invalid rule type', async () => {
      mockRequest.body = { name: 'Test Rule', ruleType: 'invalid', value: 10 };

      await controller.createPricingRule(mockRequest as Request, mockResponse as Response);

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

  describe('getPricingAnalytics', () => {
    it('should get pricing analytics successfully', async () => {
      await controller.getPricingAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            summary: expect.any(Object),
            rulePerformance: expect.any(Array),
            strategyBreakdown: expect.any(Object)
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
      mockRequest.body = { productId: 'invalid-product', basePrice: 'invalid' };

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

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
      const productId = 'product-123';
      const basePrice = 100;

      mockRequest.body = { productId, basePrice };

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

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

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

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