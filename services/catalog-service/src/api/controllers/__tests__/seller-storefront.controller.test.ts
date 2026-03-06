import { Request, Response } from 'express';
import { SellerStorefrontController } from '../../../src/api/controllers/seller-storefront.controller';

describe('SellerStorefrontController', () => {
  let controller: SellerStorefrontController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new SellerStorefrontController('https://maysar.co.tz');
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      params: {},
      body: {},
      query: {}
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe('getStorefront', () => {
    it('should return storefront details with share URLs and QR code', async () => {
      mockRequest.params = { sellerId: 'seller123' };

      await controller.getStorefront(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'seller123',
            name: expect.any(String),
            shareUrl: 'https://maysar.co.tz/seller/seller123',
            shortUrl: 'https://maysar.co.tz/s/seller123',
            qrCode: expect.any(String),
            stats: expect.objectContaining({
              totalProducts: expect.any(Number),
              rating: expect.any(Number)
            })
          })
        })
      );
    });

    it('should return 400 when seller ID is missing', async () => {
      mockRequest.params = {};

      await controller.getStorefront(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Seller ID is required'
          })
        })
      );
    });

    it('should include seller description and logo when available', async () => {
      mockRequest.params = { sellerId: 'seller123' };

      await controller.getStorefront(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.data).toHaveProperty('description');
      expect(callArgs.data).toHaveProperty('logo');
    });

    it('should generate valid QR code data URL', async () => {
      mockRequest.params = { sellerId: 'seller123' };

      await controller.getStorefront(mockRequest as Request, mockResponse as Response);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.data.qrCode).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateShareUrl', () => {
    it('should generate share URL with QR code by default', async () => {
      mockRequest.params = { sellerId: 'seller456' };
      mockRequest.body = {};

      await controller.generateShareUrl(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            shareUrl: 'https://maysar.co.tz/seller/seller456',
            shortUrl: 'https://maysar.co.tz/s/seller456',
            qrCode: expect.any(String)
          })
        })
      );
    });

    it('should generate share URL without QR code when includeQR is false', async () => {
      mockRequest.params = { sellerId: 'seller456' };
      mockRequest.body = { includeQR: false };

      await controller.generateShareUrl(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty('qrCode');
    });

    it('should use custom slug when provided', async () => {
      mockRequest.params = { sellerId: 'seller456' };
      mockRequest.body = { customSlug: 'my-custom-shop' };

      await controller.generateShareUrl(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            shareUrl: 'https://maysar.co.tz/seller/my-custom-shop',
            shortUrl: 'https://maysar.co.tz/s/my-custom-shop'
          })
        })
      );
    });

    it('should return 400 when seller ID is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = {};

      await controller.generateShareUrl(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should include timestamp in response metadata', async () => {
      mockRequest.params = { sellerId: 'seller456' };
      mockRequest.body = {};

      await controller.generateShareUrl(mockRequest as Request, mockResponse as Response);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta).toHaveProperty('timestamp');
      expect(callArgs.meta.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('URL format validation', () => {
    it('should generate URLs with correct domain', async () => {
      const customController = new SellerStorefrontController('https://custom.domain.com');
      mockRequest.params = { sellerId: 'seller789' };

      await customController.getStorefront(mockRequest as Request, mockResponse as Response);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.data.shareUrl).toBe('https://custom.domain.com/seller/seller789');
      expect(callArgs.data.shortUrl).toBe('https://custom.domain.com/s/seller789');
    });

    it('should use environment variable for base URL when not provided', () => {
      const originalEnv = process.env.BASE_URL;
      process.env.BASE_URL = 'https://env.maysar.co.tz';
      
      const envController = new SellerStorefrontController();
      expect((envController as any).baseUrl).toBe('https://env.maysar.co.tz');
      
      process.env.BASE_URL = originalEnv;
    });
  });

  describe('Error handling', () => {
    it('should handle QR code generation errors gracefully', async () => {
      // Mock QR code generation to throw error
      jest.spyOn(controller as any, 'generateQRCode').mockRejectedValue(new Error('QR generation failed'));
      
      mockRequest.params = { sellerId: 'seller123' };

      await controller.getStorefront(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(controller as any, 'getSellerDetails').mockRejectedValue(new Error('Database error'));
      
      mockRequest.params = { sellerId: 'seller123' };

      await controller.getStorefront(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
