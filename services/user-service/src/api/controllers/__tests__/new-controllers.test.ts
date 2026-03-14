import { Request, Response } from 'express';
import { DeleteAccountController } from '../delete-account.controller';
import { ChangePasswordController } from '../change-password.controller';
import { SuspendAccountController } from '../suspend-account.controller';
import { ChangeRoleController } from '../change-role.controller';
import { VerifyPhoneController } from '../verify-phone.controller';
import { SetupTwoFactorController } from '../setup-two-factor.controller';
import { ReportSecurityBreachController } from '../report-security-breach.controller';

describe('New User Controllers Integration', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUseCases: any;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      headers: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockUseCases = {
      deleteAccount: { execute: jest.fn() },
      changePassword: { execute: jest.fn() },
      suspendAccount: { execute: jest.fn() },
      changeRole: { execute: jest.fn() },
      verifyPhone: { execute: jest.fn() },
      setupTwoFactor: { execute: jest.fn() },
      reportSecurityBreach: { execute: jest.fn() }
    };
  });

  describe('DeleteAccountController', () => {
    it('should handle successful account deletion', async () => {
      const controller = new DeleteAccountController(mockUseCases.deleteAccount);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { reason: 'User requested', deletedBy: 'user-123' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      mockUseCases.deleteAccount.execute.mockResolvedValue({
        success: true,
        message: 'Account deletion initiated',
        deletionScheduledAt: new Date()
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle deletion errors', async () => {
      const controller = new DeleteAccountController(mockUseCases.deleteAccount);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { reason: 'Test', deletedBy: 'user-123' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      mockUseCases.deleteAccount.execute.mockResolvedValue({
        success: false,
        message: 'Insufficient permissions'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('ChangePasswordController', () => {
    it('should handle successful password change', async () => {
      const controller = new ChangePasswordController(mockUseCases.changePassword);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { newPassword: 'NewPassword123!', changedBy: 'user-123' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      mockUseCases.changePassword.execute.mockResolvedValue({
        success: true,
        message: 'Password changed successfully'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should validate password requirements', async () => {
      const controller = new ChangePasswordController(mockUseCases.changePassword);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { newPassword: 'short', changedBy: 'user-123' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      mockUseCases.changePassword.execute.mockResolvedValue({
        success: false,
        message: 'Password must be at least 8 characters'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('SuspendAccountController', () => {
    it('should handle successful account suspension', async () => {
      const controller = new SuspendAccountController(mockUseCases.suspendAccount);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { reason: 'Violation of terms', duration: 7 * 24 * 60 * 60 * 1000, suspendedBy: 'admin-456' };
      mockRequest.headers = { 'x-user-id': 'admin-456' };

      mockUseCases.suspendAccount.execute.mockResolvedValue({
        success: true,
        message: 'Account suspended successfully',
        suspensionEndDate: new Date()
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should enforce admin-only suspension', async () => {
      const controller = new SuspendAccountController(mockUseCases.suspendAccount);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { reason: 'Test', suspendedBy: 'user-456' };
      mockRequest.headers = { 'x-user-id': 'user-456' };

      mockUseCases.suspendAccount.execute.mockResolvedValue({
        success: false,
        message: 'Only administrators can suspend accounts'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('ChangeRoleController', () => {
    it('should handle successful role change', async () => {
      const controller = new ChangeRoleController(mockUseCases.changeRole);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { newRole: 'seller', changedBy: 'admin-456' };
      mockRequest.headers = { 'x-user-id': 'admin-456' };

      mockUseCases.changeRole.execute.mockResolvedValue({
        success: true,
        message: 'Role changed successfully',
        oldRole: 'buyer',
        newRole: 'seller'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should validate role values', async () => {
      const controller = new ChangeRoleController(mockUseCases.changeRole);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { newRole: 'invalid_role', changedBy: 'admin-456' };
      mockRequest.headers = { 'x-user-id': 'admin-456' };

      mockUseCases.changeRole.execute.mockResolvedValue({
        success: false,
        message: 'Invalid role'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('VerifyPhoneController', () => {
    it('should handle successful phone verification', async () => {
      const controller = new VerifyPhoneController(mockUseCases.verifyPhone);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { phoneNumber: '+255712345678', otp: '123456' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      mockUseCases.verifyPhone.execute.mockResolvedValue({
        success: true,
        message: 'Phone number verified successfully',
        phoneVerified: true
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should validate phone number format', async () => {
      const controller = new VerifyPhoneController(mockUseCases.verifyPhone);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { phoneNumber: 'invalid', otp: '123456' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      mockUseCases.verifyPhone.execute.mockResolvedValue({
        success: false,
        message: 'Invalid phone number format'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('SetupTwoFactorController', () => {
    it('should handle successful 2FA setup', async () => {
      const controller = new SetupTwoFactorController(mockUseCases.setupTwoFactor);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { method: 'totp' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      mockUseCases.setupTwoFactor.execute.mockResolvedValue({
        success: true,
        message: '2FA setup initiated',
        secret: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
        backupCodes: ['CODE1', 'CODE2']
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return backup codes for security', async () => {
      const controller = new SetupTwoFactorController(mockUseCases.setupTwoFactor);
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { method: 'totp' };
      mockRequest.headers = { 'x-user-id': 'user-123' };

      const backupCodes = Array.from({ length: 10 }, (_, i) => `CODE${i}`);
      mockUseCases.setupTwoFactor.execute.mockResolvedValue({
        success: true,
        message: '2FA setup initiated',
        backupCodes
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.backupCodes).toEqual(backupCodes);
    });
  });

  describe('ReportSecurityBreachController', () => {
    it('should handle security breach reporting', async () => {
      const controller = new ReportSecurityBreachController(mockUseCases.reportSecurityBreach);
      mockRequest.body = {
        userId: 'user-123',
        breachType: 'suspicious_login',
        severity: 'high',
        details: { ipAddress: '192.168.1.1' }
      };
      mockRequest.headers = { 'x-user-id': 'system' };

      mockUseCases.reportSecurityBreach.execute.mockResolvedValue({
        success: true,
        message: 'Security breach reported',
        alertId: 'alert-123'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should validate breach type and severity', async () => {
      const controller = new ReportSecurityBreachController(mockUseCases.reportSecurityBreach);
      mockRequest.body = {
        userId: 'user-123',
        breachType: 'invalid_type',
        severity: 'invalid_severity',
        details: {}
      };
      mockRequest.headers = { 'x-user-id': 'system' };

      mockUseCases.reportSecurityBreach.execute.mockResolvedValue({
        success: false,
        message: 'Invalid breach type'
      });

      await controller.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});
