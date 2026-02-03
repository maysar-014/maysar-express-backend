import { Router, Request, Response } from 'express';
import { UserController } from '@api/controllers/user.controller';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { UserValidationService } from '@domain/services/user-validation.service';
import { UserSecurityPolicy } from '@domain/policies/user-security.policy';

/**
 * API Route Definition Interface
 */
export interface ApiRouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  authorization: string[];
  requestBodyDTO?: string;
  responseBodyDTO: string;
}

/**
 * User Service API Routes Definitions
 */
export const USER_SERVICE_ROUTES: ApiRouteDefinition[] = [
  { method: 'POST', path: '/api/users', description: 'Create a new user account', authorization: ['public'], requestBodyDTO: 'CreateUserDTO.Request', responseBodyDTO: 'CreateUserDTO.Response' },
  { method: 'GET', path: '/api/users/:id', description: 'Get user by ID', authorization: ['self', 'admin'], responseBodyDTO: 'UserDTO' },
  { method: 'PUT', path: '/api/users/:id', description: 'Update user information', authorization: ['self', 'admin'], requestBodyDTO: 'UpdateUserDTO.Request', responseBodyDTO: 'UserDTO' },
  { method: 'DELETE', path: '/api/users/:id', description: 'Delete user account with data anonymization', authorization: ['self', 'admin'], requestBodyDTO: 'DeleteAccountDTO.Request', responseBodyDTO: 'DeleteAccountDTO.Response' },
  { method: 'POST', path: '/api/users/verify-email/:token', description: 'Verify user email address', authorization: ['public'], responseBodyDTO: 'VerifyEmailDTO.Response' },
  { method: 'POST', path: '/api/users/request-password-reset', description: 'Request password reset token', authorization: ['public'], requestBodyDTO: 'PasswordResetRequestDTO', responseBodyDTO: 'PasswordResetDTO.Response' },
  { method: 'POST', path: '/api/users/reset-password/:token', description: 'Reset password with token', authorization: ['public'], requestBodyDTO: 'PasswordResetDTO.Request', responseBodyDTO: 'PasswordResetDTO.Response' },
  { method: 'GET', path: '/api/users/profile', description: 'Get current user profile', authorization: ['authenticated'], responseBodyDTO: 'UserProfileDTO' },
  { method: 'PUT', path: '/api/users/profile', description: 'Update current user profile', authorization: ['authenticated'], requestBodyDTO: 'UpdateProfileDTO.Request', responseBodyDTO: 'UserProfileDTO' },
  { method: 'POST', path: '/api/users/:id/password', description: 'Change user password and invalidate sessions', authorization: ['self', 'admin'], requestBodyDTO: 'ChangePasswordDTO.Request', responseBodyDTO: 'ChangePasswordDTO.Response' },
  { method: 'POST', path: '/api/users/:id/suspend', description: 'Suspend user account', authorization: ['admin'], requestBodyDTO: 'SuspendAccountDTO.Request', responseBodyDTO: 'SuspendAccountDTO.Response' },
  { method: 'POST', path: '/api/users/:id/role', description: 'Change user role with permission sync', authorization: ['admin'], requestBodyDTO: 'ChangeRoleDTO.Request', responseBodyDTO: 'ChangeRoleDTO.Response' },
  { method: 'POST', path: '/api/users/:id/phone/verify', description: 'Verify user phone number with OTP', authorization: ['self'], requestBodyDTO: 'VerifyPhoneDTO.Request', responseBodyDTO: 'VerifyPhoneDTO.Response' },
  { method: 'POST', path: '/api/users/:id/2fa/setup', description: 'Setup two-factor authentication', authorization: ['self'], requestBodyDTO: 'SetupTwoFactorDTO.Request', responseBodyDTO: 'SetupTwoFactorDTO.Response' },
  { method: 'POST', path: '/api/security/breaches/report', description: 'Report security breach', authorization: ['system', 'security'], requestBodyDTO: 'ReportSecurityBreachDTO.Request', responseBodyDTO: 'ReportSecurityBreachDTO.Response' }
];

let userController: UserController;

function initializeController(): void {
  if (!userController) {
    const userValidationService = new UserValidationService();
    const userSecurityPolicy = new UserSecurityPolicy();
    const createUserUseCase = new CreateUserUseCase(userValidationService, userSecurityPolicy);
    userController = new UserController(createUserUseCase);
  }
}

export async function handleCreateUser(req: Request, res: Response): Promise<void> {
  await userController.createUser(req, res);
}

export async function handleGetUserById(req: Request, res: Response): Promise<void> {
  await userController.getUserById(req, res);
}

export async function handleUpdateUser(req: Request, res: Response): Promise<void> {
  await userController.updateUser(req, res);
}

export async function handleDeleteUser(req: Request, res: Response): Promise<void> {
  await userController.deleteUser(req, res);
}

export async function handleVerifyEmail(req: Request, res: Response): Promise<void> {
  await userController.verifyEmail(req, res);
}

export async function handleRequestPasswordReset(req: Request, res: Response): Promise<void> {
  await userController.requestPasswordReset(req, res);
}

export async function handleResetPassword(req: Request, res: Response): Promise<void> {
  await userController.resetPassword(req, res);
}

export async function handleGetProfile(req: Request, res: Response): Promise<void> {
  await userController.getProfile(req, res);
}

export async function handleUpdateProfile(req: Request, res: Response): Promise<void> {
  await userController.updateProfile(req, res);
}

export async function handleChangePassword(req: Request, res: Response): Promise<void> {
  await userController.changePassword(req, res);
}

export async function handleSuspendAccount(req: Request, res: Response): Promise<void> {
  await userController.suspendAccount(req, res);
}

export async function handleChangeRole(req: Request, res: Response): Promise<void> {
  await userController.changeRole(req, res);
}

export async function handleVerifyPhone(req: Request, res: Response): Promise<void> {
  await userController.verifyPhone(req, res);
}

export async function handleSetupTwoFactor(req: Request, res: Response): Promise<void> {
  await userController.setupTwoFactor(req, res);
}

export async function handleReportSecurityBreach(req: Request, res: Response): Promise<void> {
  await userController.reportSecurityBreach(req, res);
}

export function createUserRoutes(): Router {
  const router = Router();
  initializeController();

  router.post('/', handleCreateUser);
  // Profile routes must be before /:id so GET/PUT /profile are not matched as id="profile"
  router.get('/profile', handleGetProfile);
  router.put('/profile', handleUpdateProfile);
  router.get('/:id', handleGetUserById);
  router.put('/:id', handleUpdateUser);
  router.delete('/:id', handleDeleteUser);
  router.post('/verify-email/:token', handleVerifyEmail);
  router.post('/request-password-reset', handleRequestPasswordReset);
  router.post('/reset-password/:token', handleResetPassword);
  router.post('/:id/password', handleChangePassword);
  router.post('/:id/suspend', handleSuspendAccount);
  router.post('/:id/role', handleChangeRole);
  router.post('/:id/phone/verify', handleVerifyPhone);
  router.post('/:id/2fa/setup', handleSetupTwoFactor);
  router.post('/security/breaches/report', handleReportSecurityBreach);

  return router;
}
