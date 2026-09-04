import Joi from 'joi';
import { joiId } from '@shared/validation/id';
import { Router, Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { UserValidationService } from '../../domain/services/user-validation.service';
import { UserSecurityPolicy } from '../../domain/policies/user-security.policy';
import { UserMapper } from '../../application/mappers/user-mapper';
import { getSharedRedisClient } from '@shared/redis/ioredis-client';

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

import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case';
import { DeleteAccountUseCase } from '../../application/use-cases/delete-account.use-case';
import { SuspendAccountUseCase } from '../../application/use-cases/suspend-account.use-case';
import { ChangeRoleUseCase } from '../../application/use-cases/change-role.use-case';
import { VerifyPhoneUseCase } from '../../application/use-cases/verify-phone.use-case';
import { SetupTwoFactorUseCase } from '../../application/use-cases/setup-two-factor.use-case';
import { ReportSecurityBreachUseCase } from '../../application/use-cases/report-security-breach.use-case';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { GetCODReputationUseCase } from '../../application/use-cases/get-cod-reputation.use-case';
import { CODReputationController } from '../controllers/cod-reputation.controller';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { UserEventPublisher } from '../../infrastructure/messaging/user-event-publisher';
import { emailService, notificationClient } from '../../infrastructure/services/service-instances';
import { prisma } from '../../infrastructure/database/prisma-client';
import { PiiEncryptionService } from '@shared/encryption/pii-encryption.service';
import { UserOutboxRepository } from '../../infrastructure/messaging/user-outbox.repository';
import { PrismaEmailVerificationTokenRepository } from '../../infrastructure/repositories/prisma-email-verification-token.repository';
import { PrismaPasswordResetTokenRepository } from '../../infrastructure/repositories/prisma-password-reset-token.repository';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';

let userController: UserController;
let codReputationController: CODReputationController;
let userRepository: PrismaUserRepository;

const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;
const E164_PHONE_PATTERN = /^\+?\d{7,15}$/;
const TANZANIA_MOBILE_PATTERN = /^\+255[67]\d{8}$/;
const BUSINESS_ID_PATTERN = /^BIZ\d{6,10}$/;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const EXAMPLE_DOT_COM_EMAIL_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{1,63}@example\.com$/;
const userRoleValues = ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'system'] as const;
const twoFactorMethodValues = ['totp', 'sms'] as const;
const verificationMethodValues = ['otp', 'sms', 'call'] as const;

const safeVisibleString = Joi.string().min(1).pattern(SAFE_VISIBLE_STRING_PATTERN);
const nonEmptyId = joiId();
const exampleDotComEmailSchema = Joi.string()
  .trim()
  .email()
  .min(14)
  .max(76)
  .pattern(EXAMPLE_DOT_COM_EMAIL_PATTERN);

const addressSchema = Joi.object({
  // id is optional — present when updating an existing address, absent when adding a new one
  id: Joi.string().trim().max(64).optional(),
  type: Joi.string().valid('billing', 'shipping', 'business', 'home', 'work', 'other').required(),
  isPrimary: Joi.boolean().required(),
  street: safeVisibleString.required(),
  // Tanzania geographic hierarchy: ward > district > region
  ward: safeVisibleString.optional(),      // e.g. "Kivukoni" — most precise unit
  district: safeVisibleString.optional(),  // e.g. "Ilala Cbd"
  region: safeVisibleString.optional(),    // e.g. "Dar es Salaam"
  // Legacy / international fields kept for compatibility
  city: safeVisibleString.optional(),      // no longer required — ward/district/region preferred
  state: Joi.string().allow('').optional(),
  postalCode: safeVisibleString.required(),
  country: safeVisibleString.required(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).unknown(false).optional(),
}).unknown(false);

const userIdParamsSchema = Joi.object({
  id: nonEmptyId.required(),
}).unknown(false);

const codReputationParamsSchema = Joi.object({
  userId: nonEmptyId.required(),
}).unknown(false);

const tokenParamsSchema = Joi.object({
  token: safeVisibleString.required(),
}).unknown(false);

const createUserBodySchema = Joi.object({
  email: exampleDotComEmailSchema.required(),
  phoneNumber: Joi.string().trim().pattern(E164_PHONE_PATTERN).required(),
  firstName: Joi.string().min(2).max(100).pattern(SAFE_VISIBLE_STRING_PATTERN).required(),
  lastName: Joi.string().min(2).max(100).pattern(SAFE_VISIBLE_STRING_PATTERN).required(),
  dateOfBirth: Joi.date().iso().optional(),
  role: Joi.string().valid(...userRoleValues).required(),
  preferredLanguage: Joi.string().min(2).max(10).pattern(SAFE_VISIBLE_STRING_PATTERN).optional(),
  preferredCurrency: Joi.string().trim().pattern(CURRENCY_CODE_PATTERN).optional(),
  addresses: Joi.array().items(addressSchema).optional(),
  businessId: Joi.string().trim().pattern(BUSINESS_ID_PATTERN).optional(),
}).unknown(false);

const updateUserBodySchema = Joi.object({
  firstName: Joi.string().min(1).max(100).pattern(SAFE_VISIBLE_STRING_PATTERN).optional(),
  lastName: Joi.string().min(1).max(100).pattern(SAFE_VISIBLE_STRING_PATTERN).optional(),
  phoneNumber: Joi.string().trim().pattern(E164_PHONE_PATTERN).optional(),
  dateOfBirth: Joi.date().iso().optional(),
  avatar: safeVisibleString.optional(),
  language: Joi.string().min(2).max(10).pattern(SAFE_VISIBLE_STRING_PATTERN).optional(),
  timezone: safeVisibleString.optional(),
  notificationsEnabled: Joi.boolean().optional(),
  addresses: Joi.array().items(addressSchema).optional(),
}).unknown(false);

const verifyEmailBodySchema = Joi.object({
  userId: nonEmptyId.required(),
}).unknown(false);

const requestPasswordResetBodySchema = Joi.object({
  email: exampleDotComEmailSchema.required(),
}).unknown(false);

const resetPasswordBodySchema = Joi.object({
  userId: nonEmptyId.required(),
  token: safeVisibleString.required(),
  newPassword: Joi.string().min(8).required(),
}).unknown(false);

const changePasswordBodySchema = Joi.object({
  currentPassword: Joi.string().min(8).required(),
  newPassword: Joi.string().min(8).required(),
}).unknown(false);

const suspendAccountBodySchema = Joi.object({
  reason: Joi.string().min(3).max(500).pattern(SAFE_VISIBLE_STRING_PATTERN).required(),
  duration: Joi.number().integer().min(1).optional(),
}).unknown(false);

const changeRoleBodySchema = Joi.object({
  newRole: Joi.string().valid(...userRoleValues).required(),
}).unknown(false);

const verifyPhoneBodySchema = Joi.object({
  phoneNumber: Joi.string().trim().pattern(TANZANIA_MOBILE_PATTERN).required(),
  otp: Joi.string().trim().pattern(/^\d{6}$/).required(),
  verificationMethod: Joi.string().valid(...verificationMethodValues).optional(),
}).unknown(false);

const setupTwoFactorBodySchema = Joi.object({
  method: Joi.string().valid(...twoFactorMethodValues).required(),
  deviceId: safeVisibleString.optional(),
}).unknown(false);

const securityBreachBodySchema = Joi.object({
  userId: nonEmptyId.required(),
  breachType: Joi.string().valid('suspicious_login', 'multiple_failed_attempts', 'unusual_activity', 'location_anomaly').required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  details: Joi.object().unknown(true).required(),
}).unknown(false);

function initializeController(): void {
  if (!userController) {
    const userValidationService = new UserValidationService();
    const userSecurityPolicy = new UserSecurityPolicy({
      rateLimitStore: {
        incr: (key: string) => getSharedRedisClient().incr(key),
        expire: (key: string, seconds: number) => getSharedRedisClient().expire(key, seconds)
      },
      trustedDeviceLookup: {
        findFirst: async ({ where, orderBy }) => {
          const client = prisma as any;
          const deviceRepo = client.user_TrustedDevice || client.user_Device || client.user_UserDevice;
          if (!deviceRepo) {
            return null;
          }
          return deviceRepo.findFirst({ where, orderBy });
        }
      }
    });
    userRepository = new PrismaUserRepository(prisma, new PiiEncryptionService());
    const emailVerificationTokens = new PrismaEmailVerificationTokenRepository(prisma);
    const passwordResetTokens = new PrismaPasswordResetTokenRepository(prisma);
    const outboxRepository = new UserOutboxRepository(prisma);
    const eventPublisher = new UserEventPublisher(outboxRepository);

    // Instantiate all use cases with dependencies
    const createUserUseCase = new CreateUserUseCase(
      userRepository,
      userValidationService,
      userSecurityPolicy,
      eventPublisher,
      emailVerificationTokens,
      emailService,
      notificationClient
    );
    const changePasswordUseCase = new ChangePasswordUseCase(userRepository, emailService, notificationClient);
    const deleteAccountUseCase = new DeleteAccountUseCase(userRepository, emailService, notificationClient);
    const suspendAccountUseCase = new SuspendAccountUseCase(userRepository, eventPublisher, emailService, notificationClient);
    const changeRoleUseCase = new ChangeRoleUseCase(userRepository, eventPublisher, emailService, notificationClient);
    const verifyPhoneUseCase = new VerifyPhoneUseCase(userRepository, eventPublisher, emailService, notificationClient);
    const setupTwoFactorUseCase = new SetupTwoFactorUseCase(userRepository, emailService, notificationClient);
    const reportSecurityBreachUseCase = new ReportSecurityBreachUseCase(userRepository, emailService, notificationClient);
    const getUserUseCase = new GetUserUseCase(userRepository);
    const updateUserUseCase = new UpdateUserUseCase(userRepository, eventPublisher);
    const verifyEmailUseCase = new VerifyEmailUseCase(userRepository, eventPublisher, emailVerificationTokens);
    const requestPasswordResetUseCase = new RequestPasswordResetUseCase(userRepository, passwordResetTokens, emailService);
    const resetPasswordUseCase = new ResetPasswordUseCase(changePasswordUseCase, passwordResetTokens);

    userController = new UserController(
      createUserUseCase,
      changePasswordUseCase,
      deleteAccountUseCase,
      suspendAccountUseCase,
      changeRoleUseCase,
      verifyPhoneUseCase,
      setupTwoFactorUseCase,
      reportSecurityBreachUseCase,
      getUserUseCase,
      updateUserUseCase,
      verifyEmailUseCase,
      requestPasswordResetUseCase,
      resetPasswordUseCase,
      emailService,
      notificationClient,
      userRepository
    );

    const getCODReputationUseCase = new GetCODReputationUseCase(userRepository);
    codReputationController = new CODReputationController(getCODReputationUseCase);
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

export async function handleGetCODReputation(req: Request, res: Response): Promise<void> {
  await codReputationController.getReputation(req, res);
}

export async function handleDeleteAddress(req: Request, res: Response): Promise<void> {
  initializeController();
  await userController.deleteAddress(req, res);
}

function requireInternalCall(req: Request, res: Response): boolean {
  const caller = String(req.headers['x-internal-call'] || '');
  if (caller !== 'auth-service') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Internal endpoint'
      }
    });
    return false;
  }
  return true;
}

export async function handleLookupUser(req: Request, res: Response): Promise<void> {
  if (!requireInternalCall(req, res)) return;

  const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
  const phoneNumber = typeof req.query.phoneNumber === 'string' ? req.query.phoneNumber.trim() : '';

  if (!email && !phoneNumber) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'email or phoneNumber is required'
      }
    });
    return;
  }

  const user = email
    ? await userRepository.findByEmail(email)
    : await userRepository.findByPhoneNumber(phoneNumber);

  res.status(200).json({
    success: true,
    data: { user: user ? UserMapper.toResponseDto(user) : null }
  });
}

export async function handleSearchUsers(req: Request, res: Response): Promise<void> {
  if (!requireInternalCall(req, res)) return;

  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

  if (!query) {
    res.status(200).json({
      success: true,
      data: { users: [] }
    });
    return;
  }

  const users = await userRepository.search(query, limit, offset);
  res.status(200).json({
    success: true,
    data: { users: users.map(UserMapper.toResponseDto) }
  });
}

export function createUserRoutes(): Router {
  const router = Router();
  initializeController();

  router.get('/lookup', handleLookupUser);
  router.get('/search', handleSearchUsers);
  router.post('/', validateJoiRequest({ body: createUserBodySchema }), handleCreateUser);
  // Profile routes must be before /:id so GET/PUT /profile are not matched as id="profile"
  router.get('/profile', requireAuth, handleGetProfile);
  router.put('/profile', requireAuth, validateJoiRequest({ body: updateUserBodySchema }), handleUpdateProfile);
  router.get('/:id', requireAuth, validateJoiRequest({ params: userIdParamsSchema }), handleGetUserById);
  router.put('/:id', requireAuth, validateJoiRequest({ params: userIdParamsSchema, body: updateUserBodySchema }), handleUpdateUser);
  router.delete('/:id', requireAuth, validateJoiRequest({ params: userIdParamsSchema }), handleDeleteUser);
  router.post('/verify-email/:token', validateJoiRequest({ params: tokenParamsSchema, body: verifyEmailBodySchema }), handleVerifyEmail);
  router.post('/request-password-reset', validateJoiRequest({ body: requestPasswordResetBodySchema }), handleRequestPasswordReset);
  router.post('/reset-password/:token', validateJoiRequest({ params: tokenParamsSchema, body: resetPasswordBodySchema }), handleResetPassword);
  router.post('/:id/password', requireAuth, validateJoiRequest({ params: userIdParamsSchema, body: changePasswordBodySchema }), handleChangePassword);
  router.post('/:id/suspend', requireAuth, validateJoiRequest({ params: userIdParamsSchema, body: suspendAccountBodySchema }), handleSuspendAccount);
  router.post('/:id/role', requireAuth, validateJoiRequest({ params: userIdParamsSchema, body: changeRoleBodySchema }), handleChangeRole);
  router.post('/:id/phone/verify', requireAuth, validateJoiRequest({ params: userIdParamsSchema, body: verifyPhoneBodySchema }), handleVerifyPhone);
  router.post('/:id/2fa/setup', requireAuth, validateJoiRequest({ params: userIdParamsSchema, body: setupTwoFactorBodySchema }), handleSetupTwoFactor);
  router.post('/security/breaches/report', requireAuth, validateJoiRequest({ body: securityBreachBodySchema }), handleReportSecurityBreach);

  // COD Reputation routes
  router.get('/:userId/cod-reputation', requireAuth, validateJoiRequest({ params: codReputationParamsSchema }), handleGetCODReputation);

  // Address management routes
  const addressParamsSchema = Joi.object({ id: nonEmptyId.required(), addressId: nonEmptyId.required() }).unknown(false);
  router.delete('/:id/addresses/:addressId', requireAuth, validateJoiRequest({ params: addressParamsSchema }), handleDeleteAddress);

  return router;
}
