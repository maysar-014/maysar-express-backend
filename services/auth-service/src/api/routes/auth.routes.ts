import { Router } from 'express';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { rateLimit } from '../middleware/rate-limiting.middleware';
// Export factory function instead of router instance directly
export const createAuthRoutes = (authController: any): Router => { // Using any for controller to avoid type issues if imports vary, but ideally AuthController
  const router = Router();

  // ============================================================================
  // AUTHENTICATION OPERATIONS
  // ============================================================================

  /**
   * User login
   * POST /api/v1/auth/login
   */
  router.post(
    '/login',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), // Stricter limit for login
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
    validateRequest({
      body: {
        refreshToken: { type: 'string', required: true }
      }
    }),
    asyncHandler(authController.logout.bind(authController))
  );

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  router.post(
    '/refresh',
    validateRequest({
      body: {
        refreshToken: { type: 'string', required: true }
      }
    }),
    asyncHandler(authController.refreshToken.bind(authController))
  );

  /**
   * Verify session/token validity
   * GET /api/v1/auth/verify
   */
  router.get(
    '/verify',
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
    rateLimit({ windowMs: 60 * 60 * 1000, max: 3 }), // 3 requests per hour
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
    validateRequest({
      body: {
        token: { type: 'string', required: true, minLength: 32 },
        newPassword: { type: 'string', required: true, minLength: 8 },
        confirmPassword: { type: 'string', required: true }
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
        secret: { type: 'string', required: true },
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
