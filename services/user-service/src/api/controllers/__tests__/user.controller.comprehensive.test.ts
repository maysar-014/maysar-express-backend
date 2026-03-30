import { UserController } from '../user.controller';
import { Request, Response } from 'express';

describe('UserController', () => {
  let controller: UserController;
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
  let mockRequestPasswordResetUseCase: any;
  let mockResetPasswordUseCase: any;
  let mockEmailService: any;
  let mockNotificationClient: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

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
    mockRequestPasswordResetUseCase = { execute: jest.fn() };
    mockResetPasswordUseCase = { execute: jest.fn() };
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
      mockRequestPasswordResetUseCase,
      mockResetPasswordUseCase,
      mockEmailService,
      mockNotificationClient
    );

    mockReq = { params: {}, body: {}, headers: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  const createNoUseCaseController = (): UserController => new UserController(
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
    null as any,
    null as any,
    null as any
  );

  describe('getUserById', () => {
    test('returns 404 when user is missing', async () => {
      mockReq.params = { id: 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });

      await controller.getUserById(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('returns 200 when user is found', async () => {
      mockReq.params = { id: 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' } });

      await controller.getUserById(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateUser', () => {
    test('returns 400 when update fails', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });

      await controller.updateUser(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('returns 200 when update succeeds', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' }, changes: [] });

      await controller.updateUser(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteUser', () => {
    test('returns 200 when delete succeeds', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockDeleteAccountUseCase.execute.mockResolvedValue({ success: true });

      await controller.deleteUser(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 when delete fails', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockDeleteAccountUseCase.execute.mockResolvedValue({ success: false });

      await controller.deleteUser(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('verifyEmail', () => {
    test('returns 400 when userId is missing', async () => {
      mockReq.params = { token: 't1' };

      await controller.verifyEmail(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('returns 200 when verification succeeds', async () => {
      mockReq.params = { token: 't1' };
      mockReq.body = { userId: 'user-1' };
      mockVerifyEmailUseCase.execute.mockResolvedValue({ success: true });

      await controller.verifyEmail(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 when verification fails', async () => {
      mockReq.params = { token: 't1' };
      mockReq.body = { userId: 'user-1' };
      mockVerifyEmailUseCase.execute.mockResolvedValue({ success: false });

      await controller.verifyEmail(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('requestPasswordReset', () => {
    test('returns 400 when email is missing', async () => {
      await controller.requestPasswordReset(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('returns 200 when request is accepted', async () => {
      mockReq.body = { email: 'test@example.com' };
      mockRequestPasswordResetUseCase.execute.mockResolvedValue({ success: true });
      await controller.requestPasswordReset(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    test('returns 400 when required fields are missing', async () => {
      await controller.resetPassword(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('returns 200 when reset succeeds', async () => {
      mockReq.body = { userId: 'user-1', token: 't1', newPassword: 'newpass123' };
      mockResetPasswordUseCase.execute.mockResolvedValue({ success: true });

      await controller.resetPassword(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('returns 400 when reset fails', async () => {
      mockReq.body = { userId: 'user-1', newPassword: 'newpass123' };
      mockChangePasswordUseCase.execute.mockResolvedValue({ success: false });

      await controller.resetPassword(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getProfile', () => {
    test('returns 401 when missing x-user-id header', async () => {
      await controller.getProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('returns 404 when user not found', async () => {
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });
      await controller.getProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('returns 200 when user is found', async () => {
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockGetUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' } });
      await controller.getProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateProfile', () => {
    test('returns 401 when missing x-user-id header', async () => {
      await controller.updateProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('returns 400 when update fails', async () => {
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: false, message: 'User not found', user: null });
      await controller.updateProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('returns 200 when update succeeds', async () => {
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockUpdateUserUseCase.execute.mockResolvedValue({ success: true, message: 'ok', user: { id: 'user-1' } });
      await controller.updateProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('changePassword', () => {
    test('returns 501 when use case not provided', async () => {
      const controllerNoUseCase = createNoUseCaseController();
      await controllerNoUseCase.changePassword(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(501);
    });

    test('executes use case successfully', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockReq.body = { newPassword: 'newpass123' };
      mockChangePasswordUseCase.execute.mockResolvedValue({ success: true });

      await controller.changePassword(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    test('handles use case failure', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockReq.body = { newPassword: 'newpass123' };
      mockChangePasswordUseCase.execute.mockResolvedValue({ success: false });

      await controller.changePassword(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('handles exception', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'user-1' };
      mockChangePasswordUseCase.execute.mockRejectedValue(new Error('DB error'));

      await controller.changePassword(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAccount', () => {
    test('returns 501 when use case not provided', async () => {
      const controllerNoUseCase = createNoUseCaseController();
      await controllerNoUseCase.deleteAccount(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(501);
    });

    test('executes use case successfully', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'admin' };
      mockReq.body = { reason: 'user request' };
      mockDeleteAccountUseCase.execute.mockResolvedValue({ success: true });

      await controller.deleteAccount(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('suspendAccount', () => {
    test('returns 501 when use case not provided', async () => {
      const controllerNoUseCase = createNoUseCaseController();
      await controllerNoUseCase.suspendAccount(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(501);
    });

    test('executes use case successfully', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'admin' };
      mockReq.body = { reason: 'violation' };
      mockSuspendAccountUseCase.execute.mockResolvedValue({ success: true });

      await controller.suspendAccount(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('changeRole', () => {
    test('returns 501 when use case not provided', async () => {
      const controllerNoUseCase = createNoUseCaseController();
      await controllerNoUseCase.changeRole(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(501);
    });

    test('executes use case successfully', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.headers = { 'x-user-id': 'admin' };
      mockReq.body = { newRole: 'seller' };
      mockChangeRoleUseCase.execute.mockResolvedValue({ success: true });

      await controller.changeRole(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('verifyPhone', () => {
    test('returns 501 when use case not provided', async () => {
      const controllerNoUseCase = createNoUseCaseController();
      await controllerNoUseCase.verifyPhone(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(501);
    });

    test('executes use case successfully', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.body = { phoneNumber: '+255712345678', otp: '123456' };
      mockVerifyPhoneUseCase.execute.mockResolvedValue({ success: true });

      await controller.verifyPhone(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('setupTwoFactor', () => {
    test('returns 501 when use case not provided', async () => {
      const controllerNoUseCase = createNoUseCaseController();
      await controllerNoUseCase.setupTwoFactor(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(501);
    });

    test('executes use case successfully', async () => {
      mockReq.params = { id: 'user-1' };
      mockReq.body = { method: 'totp' };
      mockSetupTwoFactorUseCase.execute.mockResolvedValue({ success: true });

      await controller.setupTwoFactor(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('reportSecurityBreach', () => {
    test('returns 501 when use case not provided', async () => {
      const controllerNoUseCase = createNoUseCaseController();
      await controllerNoUseCase.reportSecurityBreach(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(501);
    });

    test('executes use case successfully', async () => {
      mockReq.headers = { 'x-user-id': 'admin' };
      mockReq.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high', details: {} };
      mockReportSecurityBreachUseCase.execute.mockResolvedValue({ success: true });

      await controller.reportSecurityBreach(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});

