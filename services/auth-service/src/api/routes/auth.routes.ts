import { Router } from 'express';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { rateLimit } from '../middleware/rate-limiting.middleware';
import { csrfValidationMiddleware } from '@shared/middleware/csrf.middleware';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { AuthController } from '../controllers/auth.controller';

type AuthControllerHandlers = Pick<AuthController,
  | 'register'
  | 'login'
  | 'logout'
  | 'refreshToken'
  | 'verifySession'
  | 'forgotPassword'
  | 'resetPassword'
  | 'enableTwoFactor'
  | 'disableTwoFactor'
  | 'verifyTwoFactorSetup'
  | 'reportSuspiciousActivity'
  | 'getAuthStats'>;

const parseLimit = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isProduction = process.env.NODE_ENV === 'production';
const registerLimitMax = parseLimit(process.env.AUTH_REGISTER_RATE_LIMIT_MAX, isProduction ? 10 : 60);
const loginLimitMax = parseLimit(process.env.AUTH_LOGIN_RATE_LIMIT_MAX, isProduction ? 5 : 60);

// Export factory function instead of router instance directly
export const createAuthRoutes = (authController: AuthControllerHandlers): Router => {
  const router = Router();

  // ============================================================================
  // AUTHENTICATION OPERATIONS
  // ============================================================================

  /**
   * User registration
   * POST /api/v1/auth/register
   */
  router.post(
    '/register',
    rateLimit({ windowMs: 15 * 60 * 1000, max: registerLimitMax, prefix: 'rl:register:' }),
    csrfValidationMiddleware,
    validateRequest({
      body: {
        email: { type: 'string', required: true, format: 'email' },
        phoneNumber: { type: 'string', required: true, pattern: /^[+]?[\d\s().-]{7,20}$/ },
        firstName: { type: 'string', required: true, minLength: 2, maxLength: 100, pattern: /^(?=.*\S).+$/ },
        lastName: { type: 'string', required: true, minLength: 2, maxLength: 100, pattern: /^(?=.*\S).+$/ },
        role: {
          type: 'string',
          required: false,
          enum: ['buyer', 'seller', 'courier', 'supplier', 'enabler', 'system', 'admin', 'user']
        },
        phone: { type: 'string', required: false, pattern: /^[+]?[\d\s().-]{7,20}$/ },
        profile: { type: 'object', required: false },
        password: { type: 'string', required: true, minLength: 8 }
      }
    }),
    asyncHandler(authController.register.bind(authController))
  );

  /**
   * User login
   * POST /api/v1/auth/login
   */
  router.post(
    '/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: loginLimitMax,
      skipSuccessfulRequests: true,
      prefix: 'rl:login:'
    }),
    csrfValidationMiddleware,
    validateRequest({
      body: {
        email: { type: 'string', required: true, format: 'email' },
        password: { type: 'string', required: true, minLength: 8 },
        totpCode: { type: 'string', required: false, pattern: /^\d{6}$/ }
      }
    }),
    asyncHandler(authController.login.bind(authController))
  );

  /**
   * User logout
   * POST /api/v1/auth/logout
   */
  router.post(
    '/logout',
    csrfValidationMiddleware,
    asyncHandler(authController.logout.bind(authController))
  );

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  router.post(
    '/refresh',
    asyncHandler(authController.refreshToken.bind(authController))
  );

  /**
   * Verify session/token validity
   * GET /api/v1/auth/verify
   */
  router.get(
    '/verify',
    requireAuth,
    validateRequest({
      headers: {
        authorization: { type: 'string', required: true, pattern: /^Bearer\s+/ }
      }
    }),
    asyncHandler(authController.verifySession.bind(authController))
  );

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  router.post(
    '/forgot-password',
    rateLimit({ windowMs: 60 * 60 * 1000, max: 3, prefix: 'rl:forgot-pwd:' }), // 3 requests per hour
    csrfValidationMiddleware,
    validateRequest({
      body: {
        email: { type: 'string', required: true, format: 'email' }
      }
    }),
    asyncHandler(authController.forgotPassword.bind(authController))
  );

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  router.post(
    '/reset-password',
    csrfValidationMiddleware,
    validateRequest({
      body: {
        token: { type: 'string', required: true, minLength: 32 },
        newPassword: { type: 'string', required: true, minLength: 8 },
        confirmPassword: { type: 'string', required: true, minLength: 8 }
      }
    }),
    asyncHandler(authController.resetPassword.bind(authController))
  );

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================================

  /**
   * Enable 2FA for user
   * POST /api/v1/auth/2fa/enable
   */
  router.post(
    '/2fa/enable',
    csrfValidationMiddleware,
    validateRequest({
      body: {
        password: { type: 'string', required: true },
        totpCode: { type: 'string', required: true, pattern: /^\d{6}$/ }
      }
    }),
    asyncHandler(authController.enableTwoFactor.bind(authController))
  );

  /**
   * Disable 2FA for user
   * POST /api/v1/auth/2fa/disable
   */
  router.post(
    '/2fa/disable',
    csrfValidationMiddleware,
    validateRequest({
      body: {
        password: { type: 'string', required: true }
      }
    }),
    asyncHandler(authController.disableTwoFactor.bind(authController))
  );

  /**
   * Verify 2FA setup
   * POST /api/v1/auth/2fa/verify
   */
  router.post(
    '/2fa/verify',
    validateRequest({
      body: {
        secret: { type: 'string', required: true, minLength: 16, maxLength: 64, pattern: /^[A-Z2-7]+=*$/ },
        totpCode: { type: 'string', required: true, pattern: /^\d{6}$/ }
      }
    }),
    asyncHandler(authController.verifyTwoFactorSetup.bind(authController))
  );

  // ============================================================================
  // SECURITY & MONITORING
  // ============================================================================

  /**
   * Report suspicious activity
   * POST /api/v1/auth/report-suspicious
   */
  router.post(
    '/report-suspicious',
    validateRequest({
      body: {
        activity: { type: 'string', required: true },
        details: { type: 'object', required: false }
      }
    }),
    asyncHandler(authController.reportSuspiciousActivity.bind(authController))
  );

  /**
   * Get authentication statistics (admin only)
   * GET /api/v1/auth/stats
   */
  router.get(
    '/stats',
    // TODO: Add admin role validation middleware
    asyncHandler(authController.getAuthStats.bind(authController))
  );

  return router;
};
