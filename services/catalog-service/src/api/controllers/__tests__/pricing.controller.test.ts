/**
 * Pricing Controller Test Suite
 * Tests for pricing controller functionality
 */

import { Request, Response } from 'express';
import { PricingController } from '../pricing.controller';

describe('PricingController', () => {
  let controller: PricingController;

  const createMockResponse = (): Partial<Response> => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  });

  beforeEach(() => {
    controller = new PricingController();
  });

  describe('calculatePrice', () => {
    it('should calculate price successfully', async () => {
      const mockRequest = {
        body: { basePrice: 100, discount: 15 }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            basePrice: 100,
            discount: 15,
            finalPrice: 85
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should fall back to zero for missing price values', async () => {
      const mockRequest = {
        body: {}
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.calculatePrice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            basePrice: 0,
            discount: 0,
            finalPrice: 0
          }
        })
      );
    });
  });

  describe('updateProductPrice', () => {
    it('should update product price successfully', async () => {
      const mockRequest = {
        params: { productId: 'product-123' },
        body: { pricingStrategy: 'fixed', pricingValue: 99.99 }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.updateProductPrice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            productId: 'product-123',
            updated: true,
            pricing: {
              pricingStrategy: 'fixed',
              pricingValue: 99.99
            }
          })
        })
      );
    });

    it('should handle missing product ID', async () => {
      const mockRequest = {
        params: {},
        body: { pricingStrategy: 'fixed', pricingValue: 99.99 }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.updateProductPrice(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Product ID is required'
          })
        })
      );
    });
  });

  describe('bulkUpdatePricing', () => {
    it('should bulk update pricing successfully', async () => {
      const mockRequest = {
        body: {
          updates: [
            { productId: 'product-1' },
            { productId: 'product-2' },
            { productId: 'product-3' }
          ]
        }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.bulkUpdatePricing(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            updatedCount: 3
          }
        })
      );
    });

    it('should handle missing updates array', async () => {
      const mockRequest = { body: {} } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.bulkUpdatePricing(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            updatedCount: 0
          }
        })
      );
    });
  });

  describe('getPricingRules', () => {
    it('should get pricing rules successfully', async () => {
      const mockRequest = {} as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getPricingRules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            rules: []
          }
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

      const mockRequest = { body: ruleData } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.createPricingRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            rule: ruleData
          }
        })
      );
    });

    it('should echo partial rule payloads', async () => {
      const mockRequest = {
        body: { ruleType: 'percentage_discount', value: 10 }
      } as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.createPricingRule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            rule: {
              ruleType: 'percentage_discount',
              value: 10
            }
          }
        })
      );
    });
  });

  describe('getPricingAnalytics', () => {
    it('should get pricing analytics successfully', async () => {
      const mockRequest = {} as Partial<Request>;
      const mockResponse = createMockResponse();

      await controller.getPricingAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            revenueImpact: 0,
            conversionImpact: 0,
            discountsApplied: 0
          }
        })
      );
    });
  });
});
