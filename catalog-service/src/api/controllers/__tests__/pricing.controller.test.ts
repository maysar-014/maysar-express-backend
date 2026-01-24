/**
 * Pricing Controller Tests
 * Comprehensive API layer testing for pricing operations
 * Tests real controller implementation with mocked dependencies
 * Follows testing constitution: Fast, Isolated, Deterministic, Focused, Readable
 */

import { Request, Response } from 'express';
import { PricingController } from '../pricing.controller';

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

describe('PricingController', () => {
  let controller: PricingController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PricingController();
  });

  describe('calculatePrice', () => {
    it('should calculate price successfully', async () => {
      const req = mockRequest({
        productId: 'product-123',
        basePrice: 100,
        pricingRules: [
          { type: 'percentage_discount', value: 10, id: 'rule-1', name: 'Discount' }
        ]
      });
      const res = mockResponse();

      await controller.calculatePrice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          productId: 'product-123',
          basePrice: 100,
          finalPrice: 90,
          totalDiscount: 10
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should validate required fields', async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await controller.calculatePrice(req, res);

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

    it('should handle invalid base price', async () => {
      const req = mockRequest({
        productId: 'product-123',
        basePrice: -10
      });
      const res = mockResponse();

      await controller.calculatePrice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({
        productId: 'product-123',
        basePrice: 100
      });
      const res = mockResponse();
      
      // Mock an error by making res.status throw
      res.status = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await controller.calculatePrice(req, res);

      // The error should be caught and handled
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('updateProductPrice', () => {
    it('should update product price successfully', async () => {
      const req = mockRequest(
        {
          pricingStrategy: 'fixed',
          pricingValue: 150,
          requestedBy: 'admin'
        },
        { productId: 'product-123' }
      );
      const res = mockResponse();

      await controller.updateProductPrice(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          productId: 'product-123',
          newPrice: { amount: 150, currency: 'USD' },
          changeAmount: 50
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should validate product ID', async () => {
      const req = mockRequest({
        pricingStrategy: 'fixed',
        pricingValue: 150
      });
      const res = mockResponse();

      await controller.updateProductPrice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate pricing strategy', async () => {
      const req = mockRequest(
        {
          pricingStrategy: 'invalid',
          pricingValue: 150
        },
        { productId: 'product-123' }
      );
      const res = mockResponse();

      await controller.updateProductPrice(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('bulkUpdatePricing', () => {
    it('should bulk update pricing successfully', async () => {
      const req = mockRequest({
        productIds: ['product-1', 'product-2'],
        pricingStrategy: 'percentage',
        pricingValue: 120,
        requestedBy: 'admin'
      });
      const res = mockResponse();

      await controller.bulkUpdatePricing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalProducts: 2,
          successfulUpdates: 2,
          failedUpdates: 0
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should validate product IDs array', async () => {
      const req = mockRequest({
        productIds: [],
        pricingStrategy: 'fixed',
        pricingValue: 100
      });
      const res = mockResponse();

      await controller.bulkUpdatePricing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getPricingRules', () => {
    it('should get pricing rules successfully', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.getPricingRules(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            ruleId: expect.any(String),
            ruleType: expect.any(String),
            name: expect.any(String)
          })
        ]),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });
  });

  describe('createPricingRule', () => {
    it('should create pricing rule successfully', async () => {
      const req = mockRequest({
        name: 'Test Rule',
        ruleType: 'percentage_discount',
        value: 15,
        priority: 1
      });
      const res = mockResponse();

      await controller.createPricingRule(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          ruleId: expect.any(String),
          name: 'Test Rule',
          ruleType: 'percentage_discount',
          value: 15
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });

    it('should validate rule name', async () => {
      const req = mockRequest({
        ruleType: 'percentage_discount',
        value: 15
      });
      const res = mockResponse();

      await controller.createPricingRule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate rule type', async () => {
      const req = mockRequest({
        name: 'Test Rule',
        ruleType: 'invalid_type',
        value: 15
      });
      const res = mockResponse();

      await controller.createPricingRule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getPricingAnalytics', () => {
    it('should get pricing analytics successfully', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.getPricingAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          summary: expect.any(Object),
          rulePerformance: expect.any(Array),
          strategyBreakdown: expect.any(Object)
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(Date)
        })
      });
    });
  });

  describe('error handling', () => {
    it('should handle internal errors', async () => {
      const req = mockRequest({
        productId: 'product-123',
        basePrice: 100
      });
      const res = mockResponse();

      // Force an error by making JSON.stringify fail
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('JSON error');
      });

      await controller.calculatePrice(req, res);

      // Restore original function
      JSON.stringify = originalStringify;

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});