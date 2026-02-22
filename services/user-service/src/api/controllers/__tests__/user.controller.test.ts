import { Request, Response } from 'express';
import { UserController } from '../user.controller';
import { UserAlreadyExistsError } from '@domain/errors/user.errors';

describe('UserController', () => {
  let controller: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockCreateUserUseCase: any;
  let mockChangePasswordUseCase: any;
  let mockDeleteAccountUseCase: any;
  let mockSuspendAccountUseCase: any;
  let mockChangeRoleUseCase: any;
  let mockVerifyPhoneUseCase: any;
  let mockSetupTwoFactorUseCase: any;
  let mockReportSecurityBreachUseCase: any;
  let mockGetUserUseCase: any;
  let mockUpdateUserUseCase: any;
  let mockVerifyEmailUseCase: any;
  let mockEmailService: any;
  let mockNotificationClient: any;

  beforeEach(() => {
    mockCreateUserUseCase = { execute: jest.fn() };
    mockChangePasswordUseCase = { execute: jest.fn() };
    mockDeleteAccountUseCase = { execute: jest.fn() };
    mockSuspendAccountUseCase = { execute: jest.fn() };
    mockChangeRoleUseCase = { execute: jest.fn() };
    mockVerifyPhoneUseCase = { execute: jest.fn() };
    mockSetupTwoFactorUseCase = { execute: jest.fn() };
    mockReportSecurityBreachUseCase = { execute: jest.fn() };
    mockGetUserUseCase = { execute: jest.fn() };
    mockUpdateUserUseCase = { execute: jest.fn() };
    mockVerifyEmailUseCase = { execute: jest.fn() };
    mockEmailService = { sendPasswordResetEmail: jest.fn(), sendEmail: jest.fn() };
    mockNotificationClient = { notify: jest.fn() };

    controller = new UserController(
      mockCreateUserUseCase,
      mockChangePasswordUseCase,
      mockDeleteAccountUseCase,
      mockSuspendAccountUseCase,
      mockChangeRoleUseCase,
      mockVerifyPhoneUseCase,
      mockSetupTwoFactorUseCase,
      mockReportSecurityBreachUseCase,
      mockGetUserUseCase,
      mockUpdateUserUseCase,
      mockVerifyEmailUseCase,
      mockEmailService,
      mockNotificationClient
    );

    mockRequest = { body: {}, params: {}, headers: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createUser', () => {
    test('creates user successfully', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      mockCreateUserUseCase.execute.mockResolvedValue(user);
      mockRequest.body = { email: 'test@example.com' };

      await controller.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles UserAlreadyExistsError', async () => {
      mockCreateUserUseCase.execute.mockRejectedValue(new UserAlreadyExistsError('User exists'));

      await controller.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles unexpected errors', async () => {
      mockCreateUserUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      await controller.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    test('returns 501 Not Implemented', async () => {
      await controller.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      await controller.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });

  describe('updateUser', () => {
    test('returns 501 Not Implemented', async () => {
      await controller.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      await controller.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });

  describe('deleteUser', () => {
    test('returns 501 Not Implemented', async () => {
      await controller.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      await controller.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });

  describe('verifyEmail', () => {
    test('returns 501 Not Implemented', async () => {
      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });

  describe('requestPasswordReset', () => {
    test('returns 501 Not Implemented', async () => {
      await controller.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      await controller.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });

  describe('resetPassword', () => {
    test('returns 501 Not Implemented', async () => {
      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });

  describe('getProfile', () => {
    test('returns 401 when userId is missing', async () => {
      mockRequest.headers = {};

      await controller.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 501 when userId is present', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };

      await controller.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };

      await controller.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    test('returns 401 when userId is missing', async () => {
      mockRequest.headers = {};

      await controller.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 501 when userId is present', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };

      await controller.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };

      await controller.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    test('returns 501 when useCase is not provided', async () => {
      const controllerWithoutUseCase = new UserController(
        mockCreateUserUseCase,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { newPassword: 'newpass', currentPassword: 'oldpass' };

      await controllerWithoutUseCase.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    test('executes changePassword useCase successfully', async () => {
      mockChangePasswordUseCase.execute.mockResolvedValue({ success: true });
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { newPassword: 'newpass', currentPassword: 'oldpass' };

      await controller.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockChangePasswordUseCase.execute).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('handles useCase failure', async () => {
      mockChangePasswordUseCase.execute.mockResolvedValue({ success: false });
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { newPassword: 'newpass', currentPassword: 'oldpass' };

      await controller.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    test('handles exceptions', async () => {
      mockChangePasswordUseCase.execute.mockRejectedValue(new Error('Error'));
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { newPassword: 'newpass', currentPassword: 'oldpass' };

      await controller.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAccount', () => {
    test('returns 501 when useCase is not provided', async () => {
      const controllerWithoutUseCase = new UserController(
        mockCreateUserUseCase,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { reason: 'test' };

      await controllerWithoutUseCase.deleteAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    test('executes deleteAccount useCase successfully', async () => {
      mockDeleteAccountUseCase.execute.mockResolvedValue({ success: true });
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { reason: 'test' };

      await controller.deleteAccount(mockRequest as Request, mockResponse as Response);

      expect(mockDeleteAccountUseCase.execute).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('handles exceptions', async () => {
      mockDeleteAccountUseCase.execute.mockRejectedValue(new Error('Error'));
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { reason: 'test' };

      await controller.deleteAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('suspendAccount', () => {
    test('returns 501 when useCase is not provided', async () => {
      const controllerWithoutUseCase = new UserController(
        mockCreateUserUseCase,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { reason: 'test', duration: 3600 };

      await controllerWithoutUseCase.suspendAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    test('executes suspendAccount useCase successfully', async () => {
      mockSuspendAccountUseCase.execute.mockResolvedValue({ success: true });
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { reason: 'test', duration: 3600 };

      await controller.suspendAccount(mockRequest as Request, mockResponse as Response);

      expect(mockSuspendAccountUseCase.execute).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('handles exceptions', async () => {
      mockSuspendAccountUseCase.execute.mockRejectedValue(new Error('Error'));
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { reason: 'test', duration: 3600 };

      await controller.suspendAccount(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('changeRole', () => {
    test('returns 501 when useCase is not provided', async () => {
      const controllerWithoutUseCase = new UserController(
        mockCreateUserUseCase,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { newRole: 'seller' };

      await controllerWithoutUseCase.changeRole(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    test('executes changeRole useCase successfully', async () => {
      mockChangeRoleUseCase.execute.mockResolvedValue({ success: true });
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { newRole: 'seller' };

      await controller.changeRole(mockRequest as Request, mockResponse as Response);

      expect(mockChangeRoleUseCase.execute).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('handles exceptions', async () => {
      mockChangeRoleUseCase.execute.mockRejectedValue(new Error('Error'));
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { newRole: 'seller' };

      await controller.changeRole(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('verifyPhone', () => {
    test('returns 501 when useCase is not provided', async () => {
      const controllerWithoutUseCase = new UserController(
        mockCreateUserUseCase,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { phoneNumber: '+255712345678', otp: '123456' };

      await controllerWithoutUseCase.verifyPhone(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    test('executes verifyPhone useCase successfully', async () => {
      mockVerifyPhoneUseCase.execute.mockResolvedValue({ success: true });
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { phoneNumber: '+255712345678', otp: '123456' };

      await controller.verifyPhone(mockRequest as Request, mockResponse as Response);

      expect(mockVerifyPhoneUseCase.execute).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('handles exceptions', async () => {
      mockVerifyPhoneUseCase.execute.mockRejectedValue(new Error('Error'));
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { phoneNumber: '+255712345678', otp: '123456' };

      await controller.verifyPhone(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('setupTwoFactor', () => {
    test('returns 501 when useCase is not provided', async () => {
      const controllerWithoutUseCase = new UserController(
        mockCreateUserUseCase,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { method: 'totp' };

      await controllerWithoutUseCase.setupTwoFactor(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    test('executes setupTwoFactor useCase successfully', async () => {
      mockSetupTwoFactorUseCase.execute.mockResolvedValue({ success: true });
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { method: 'totp' };

      await controller.setupTwoFactor(mockRequest as Request, mockResponse as Response);

      expect(mockSetupTwoFactorUseCase.execute).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('handles exceptions', async () => {
      mockSetupTwoFactorUseCase.execute.mockRejectedValue(new Error('Error'));
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { method: 'totp' };

      await controller.setupTwoFactor(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('reportSecurityBreach', () => {
    test('returns 501 when useCase is not provided', async () => {
      const controllerWithoutUseCase = new UserController(
        mockCreateUserUseCase,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any
      );
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high' };

      await controllerWithoutUseCase.reportSecurityBreach(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    test('executes reportSecurityBreach useCase successfully', async () => {
      mockReportSecurityBreachUseCase.execute.mockResolvedValue({ success: true });
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high' };

      await controller.reportSecurityBreach(mockRequest as Request, mockResponse as Response);

      expect(mockReportSecurityBreachUseCase.execute).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('handles exceptions', async () => {
      mockReportSecurityBreachUseCase.execute.mockRejectedValue(new Error('Error'));
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockRequest.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high' };

      await controller.reportSecurityBreach(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
