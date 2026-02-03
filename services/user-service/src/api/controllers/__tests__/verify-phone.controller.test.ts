import { Request, Response } from 'express';
import { VerifyPhoneController } from '../verify-phone.controller';
import { VerifyPhoneUseCase } from '@application/use-cases';

describe('VerifyPhoneController', () => {
  let controller: VerifyPhoneController;
  let mockVerifyPhoneUseCase: jest.Mocked<VerifyPhoneUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockVerifyPhoneUseCase = {
      execute: jest.fn(),
    } as any;

    controller = new VerifyPhoneController(mockVerifyPhoneUseCase);

    mockRequest = {
      params: { id: 'user-123' },
      body: {
        phoneNumber: '+255712345678',
        otp: '123456',
        verificationMethod: 'otp'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('handle', () => {
    it('should verify phone successfully', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified successfully',
        phoneVerified: true
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          phoneVerified: true
        })
      );
    });

    it('should return 400 when verification fails', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: false,
        message: 'Invalid OTP'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should validate user ID is present', async () => {
      mockRequest.params = {};

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Missing required fields'
        })
      );
    });

    it('should validate phone number is present', async () => {
      mockRequest.body = { otp: '123456' };

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Missing required fields'
        })
      );
    });

    it('should validate OTP is present', async () => {
      mockRequest.body = { phoneNumber: '+255712345678' };

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Missing required fields'
        })
      );
    });

    it('should pass correct input to use case', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockVerifyPhoneUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          phoneNumber: '+255712345678',
          otp: '123456',
          verificationMethod: 'otp'
        })
      );
    });

    it('should handle use case errors', async () => {
      mockVerifyPhoneUseCase.execute.mockRejectedValue(new Error('DB error'));

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error'
        })
      );
    });

    it('should support SMS verification method', async () => {
      mockRequest.body = {
        phoneNumber: '+255712345678',
        otp: '123456',
        verificationMethod: 'call'
      };

      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockVerifyPhoneUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationMethod: 'call'
        })
      );
    });

    it('should handle missing verification method', async () => {
      mockRequest.body = {
        phoneNumber: '+255712345678',
        otp: '123456'
      };

      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockVerifyPhoneUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should return success flag', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('success');
    });

    it('should return message', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified successfully'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('message');
    });

    it('should include phoneVerified flag on success', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified',
        phoneVerified: true
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.phoneVerified).toBe(true);
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 200 on success', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Phone verified'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on validation failure', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({
        success: false,
        message: 'Invalid OTP'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on missing fields', async () => {
      mockRequest.params = {};

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on server error', async () => {
      mockVerifyPhoneUseCase.execute.mockRejectedValue(new Error('Server error'));

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Input Validation', () => {
    it('should validate all required fields together', async () => {
      mockRequest.body = {};
      mockRequest.params = {};

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should accept valid phone number formats', async () => {
      const validPhoneNumbers = [
        '+255712345678',
        '+255622345678',
        '0712345678'
      ];

      for (const phoneNumber of validPhoneNumbers) {
        mockRequest.body = {
          phoneNumber,
          otp: '123456',
          verificationMethod: 'otp'
        };

        mockVerifyPhoneUseCase.execute.mockResolvedValue({
          success: true,
          message: 'Phone verified'
        });

        await controller.handle(mockRequest as Request, mockResponse as Response);

        expect(mockVerifyPhoneUseCase.execute).toHaveBeenCalled();
      }
    });

    it('should accept valid OTP formats', async () => {
      const validOTPs = ['123456', '000000', '999999'];

      for (const otp of validOTPs) {
        mockRequest.body = {
          phoneNumber: '+255712345678',
          otp,
          verificationMethod: 'otp'
        };

        mockVerifyPhoneUseCase.execute.mockResolvedValue({
          success: true,
          message: 'Phone verified'
        });

        await controller.handle(mockRequest as Request, mockResponse as Response);

        expect(mockVerifyPhoneUseCase.execute).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should catch and handle exceptions', async () => {
      mockVerifyPhoneUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      mockVerifyPhoneUseCase.execute.mockRejectedValue(new Error('Error'));

      await expect(
        controller.handle(mockRequest as Request, mockResponse as Response)
      ).resolves.not.toThrow();
    });
  });
});
