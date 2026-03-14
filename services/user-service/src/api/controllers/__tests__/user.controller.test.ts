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
    test('returns 404 when user not found', async () => {
      mockRequest.params = { id: 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });

      await controller.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 200 when user is found', async () => {
      mockRequest.params = { id: 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' } });

      await controller.getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    test('returns 400 when update fails', async () => {
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });

      await controller.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 200 when update succeeds', async () => {
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' }, changes: [] });

      await controller.updateUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    test('returns 200 when delete succeeds', async () => {
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockDeleteAccountUseCase.execute.mockResolvedValue({ success: true });

      await controller.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 400 when delete fails', async () => {
      mockRequest.params = { id: 'user-1' };
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockDeleteAccountUseCase.execute.mockResolvedValue({ success: false });

      await controller.deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    test('returns 400 when userId is missing', async () => {
      mockRequest.params = { token: 't1' };

      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 200 when verification succeeds', async () => {
      mockRequest.params = { token: 't1' };
      mockRequest.body = { userId: 'user-1' };
      mockVerifyEmailUseCase.execute.mockResolvedValue({ success: true });

      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 400 when verification fails', async () => {
      mockRequest.params = { token: 't1' };
      mockRequest.body = { userId: 'user-1' };
      mockVerifyEmailUseCase.execute.mockResolvedValue({ success: false });

      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    test('returns 400 when email is missing', async () => {
      await controller.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 200 when request is accepted', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await controller.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    test('returns 400 when fields are missing', async () => {
      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 200 when reset succeeds', async () => {
      mockRequest.body = { userId: 'user-1', newPassword: 'newpass' };
      mockChangePasswordUseCase.execute.mockResolvedValue({ success: true });

      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 400 when reset fails', async () => {
      mockRequest.body = { userId: 'user-1', newPassword: 'newpass' };
      mockChangePasswordUseCase.execute.mockResolvedValue({ success: false });

      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    test('returns 401 when userId is missing', async () => {
      mockRequest.headers = {};

      await controller.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 404 when user is not found', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });

      await controller.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 200 when profile is found', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' } });

      await controller.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    test('returns 401 when userId is missing', async () => {
      mockRequest.headers = {};

      await controller.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 400 when update fails', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });

      await controller.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('returns 200 when update succeeds', async () => {
      mockRequest.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' } });

      await controller.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
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
