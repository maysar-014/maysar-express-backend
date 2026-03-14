import { Request, Response } from 'express';
import { UserController } from '../../../src/api/controllers/user.controller';

describe('UserController (basic)', () => {
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
  });

  it('creates a user and returns 201', async () => {
    const req = { body: { email: 'test@example.com' } } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    mockCreateUserUseCase.execute.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

    await controller.createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
