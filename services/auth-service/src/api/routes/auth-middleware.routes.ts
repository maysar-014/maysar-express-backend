import { Router } from 'express';
import { AuthMiddlewareController } from '../controllers/auth-middleware.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { rateLimit } from '../middleware/rate-limiting.middleware';
import { isSystemId } from '@shared/ids/id';

const router = Router();
const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S).+$/;
const requireBodySystemId = (fieldName: string) => (req: any, res: any, next: any) => {
  const value = typeof req.body?.[fieldName] === 'string' ? req.body[fieldName].trim() : '';
  if (!isSystemId(value)) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [`"${fieldName}" must be a valid ID`]
    });
    return;
  }
  next();
};

// Create controller instance
const authMiddlewareController = new AuthMiddlewareController();

/**
 * Authentication Middleware Routes
 * API endpoints for authentication middleware functionality
 * All routes are prefixed with /api/v1/auth in main.ts
 */

// ============================================================================
// TOKEN VALIDATION & MANAGEMENT
// ============================================================================

/**
 * Validate JWT token
 * POST /api/v1/auth/validate-token
 */
router.post(
  '/validate-token',
  rateLimit({ windowMs: 60 * 1000, max: 100 }), // 100 requests per minute
  validateRequest({
    body: {
      token: { type: 'string', required: true, minLength: 10 }
    }
  }),
  asyncHandler(authMiddlewareController.validateToken.bind(authMiddlewareController))
);

/**
 * Check token blacklist status
 * POST /api/v1/auth/check-blacklist
 */
router.post(
  '/check-blacklist',
  rateLimit({ windowMs: 60 * 1000, max: 50 }),
  validateRequest({
    body: {
      token: { type: 'string', required: true, minLength: 10 }
    }
  }),
  asyncHandler(authMiddlewareController.checkTokenBlacklist.bind(authMiddlewareController))
);

/**
 * Blacklist token (logout functionality)
 * POST /api/v1/auth/blacklist-token
 */
router.post(
  '/blacklist-token',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validateRequest({
    body: {
      token: { type: 'string', required: true, minLength: 10 },
      reason: { type: 'string', required: false, enum: ['logout', 'security', 'admin'] }
    }
  }),
  asyncHandler(authMiddlewareController.blacklistToken.bind(authMiddlewareController))
);

// ============================================================================
// API KEY AUTHENTICATION
// ============================================================================

/**
 * Validate API key for service-to-service authentication
 * POST /api/v1/auth/validate-api-key
 */
router.post(
  '/validate-api-key',
  rateLimit({ windowMs: 60 * 1000, max: 50 }),
  validateRequest({
    body: {
      apiKey: { type: 'string', required: true, minLength: 16 }
    }
  }),
  asyncHandler(authMiddlewareController.validateApiKey.bind(authMiddlewareController))
);

/**
 * Generate new API key for service
 * POST /api/v1/auth/generate-api-key
 */
router.post(
  '/generate-api-key',
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  validateRequest({
    body: {
      serviceId: { type: 'string', required: true, minLength: 3 },
      permissions: {
        type: 'array',
        required: true,
        minItems: 1,
        items: { type: 'string', minLength: 1 }
      },
      expiresAt: { type: 'string', required: false, format: 'date-time' }
    }
  }),
  asyncHandler(authMiddlewareController.generateApiKey.bind(authMiddlewareController))
);

/**
 * Revoke API key
 * POST /api/v1/auth/revoke-api-key
 */
router.post(
  '/revoke-api-key',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validateRequest({
    body: {
      apiKey: { type: 'string', required: true, minLength: 16 },
      reason: { type: 'string', required: false, enum: ['security', 'admin', 'rotation'] }
    }
  }),
  asyncHandler(authMiddlewareController.revokeApiKey.bind(authMiddlewareController))
);

// ============================================================================
// BRUTE FORCE PROTECTION
// ============================================================================

/**
 * Check brute force protection status
 * POST /api/v1/auth/check-brute-force
 */
router.post(
  '/check-brute-force',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validateRequest({
    body: {
      identifier: { type: 'string', required: true },
      type: { type: 'string', required: true, enum: ['ip', 'email', 'user_id'] }
    }
  }),
  asyncHandler(authMiddlewareController.checkBruteForce.bind(authMiddlewareController))
);

/**
 * Record failed authentication attempt
 * POST /api/v1/auth/record-failure
 */
router.post(
  '/record-failure',
  rateLimit({ windowMs: 60 * 1000, max: 50 }),
  validateRequest({
    body: {
      identifier: { type: 'string', required: true },
      type: { type: 'string', required: true, enum: ['ip', 'email', 'user_id'] },
      reason: { type: 'string', required: false },
      ipAddress: { type: 'string', required: false, format: 'ipv4' },
      userAgent: { type: 'string', required: false }
    }
  }),
  asyncHandler(authMiddlewareController.recordFailure.bind(authMiddlewareController))
);

/**
 * Reset brute force protection for identifier
 * POST /api/v1/auth/reset-brute-force
 * Accepts either the full { identifier, type, adminReason } shape,
 * or the shorthand { email } shape used by E2E setup scripts.
 */
router.post(
  '/reset-brute-force',
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  // Normalize shorthand { email } → { identifier, type, adminReason } before validation
  // Strip unknown fields to prevent "email is not allowed" from the strict validator
  (req: any, _res: any, next: any) => {
    if (req.body?.email && !req.body?.identifier) {
      req.body = {
        identifier: req.body.email,
        type: req.body.type || 'email',
        adminReason: req.body.adminReason || 'e2e-admin-reset'
      };
    }
    next();
  },
  validateRequest({
    body: {
      identifier: { type: 'string', required: true },
      type: { type: 'string', required: true, enum: ['ip', 'email', 'user_id'] },
      adminReason: { type: 'string', required: true, minLength: 5 }
    }
  }),
  asyncHandler(authMiddlewareController.resetBruteForce.bind(authMiddlewareController))
);

// ============================================================================
// DEVICE TRACKING
// ============================================================================

/**
 * Track device for user
 * POST /api/v1/auth/track-device
 */
router.post(
  '/track-device',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validateRequest({
    body: {
      userId: { type: 'string', required: true },
      deviceId: { type: 'string', required: true },
      deviceInfo: {
        type: 'object',
        required: true,
        properties: {
          userAgent: { type: 'string' },
          ipAddress: { type: 'string', format: 'ipv4' },
          location: { type: 'object' },
          fingerprint: { type: 'string' }
        }
      },
      isNewDevice: { type: 'boolean', required: false, default: false }
    }
  }),
  asyncHandler(authMiddlewareController.trackDevice.bind(authMiddlewareController))
);

/**
 * Get device history for user
 * GET /api/v1/auth/device-history/:userId
 */
router.get(
  '/device-history/:userId',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validateRequest({
    params: {
      userId: { type: 'string', required: true, minLength: 1 }
    },
    query: {
      limit: { type: 'number', required: false, default: 10, min: 1, max: 100 },
      offset: { type: 'number', required: false, default: 0, min: 0 }
    }
  }),
  asyncHandler(authMiddlewareController.getDeviceHistory.bind(authMiddlewareController))
);

/**
 * Remove device from user's trusted devices
 * DELETE /api/v1/auth/device/:deviceId
 */
router.delete(
  '/device/:deviceId',
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  requireBodySystemId('userId'),
  validateRequest({
    params: {
      deviceId: { type: 'string', required: true, minLength: 1 }
    },
    body: {
      userId: { type: 'string', required: true },
      reason: { type: 'string', required: false, pattern: SAFE_VISIBLE_STRING_PATTERN }
    }
  }),
  asyncHandler(authMiddlewareController.removeDevice.bind(authMiddlewareController))
);

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Extend session
 * POST /api/v1/auth/extend-session
 */
router.post(
  '/extend-session',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validateRequest({
    body: {
      sessionId: { type: 'string', required: true },
      userId: { type: 'string', required: true }
    }
  }),
  asyncHandler(authMiddlewareController.extendSession.bind(authMiddlewareController))
);

/**
 * Get session info
 * GET /api/v1/auth/session/:sessionId
 */
router.get(
  '/session/:sessionId',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  validateRequest({
    params: {
      sessionId: { type: 'string', required: true, minLength: 1 }
    }
  }),
  asyncHandler(authMiddlewareController.getSessionInfo.bind(authMiddlewareController))
);

/**
 * Invalidate session
 * POST /api/v1/auth/invalidate-session
 */
router.post(
  '/invalidate-session',
  rateLimit({ windowMs: 60 * 1000, max: 20 }),
  validateRequest({
    body: {
      sessionId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      reason: { type: 'string', required: false, enum: ['logout', 'security', 'admin'] }
    }
  }),
  asyncHandler(authMiddlewareController.invalidateSession.bind(authMiddlewareController))
);

// ============================================================================
// HEALTH & MONITORING
// ============================================================================

/**
 * Authentication middleware health check
 * GET /api/v1/auth/middleware/health
 */
router.get(
  '/middleware/health',
  asyncHandler(authMiddlewareController.healthCheck.bind(authMiddlewareController))
);

/**
 * Get authentication metrics
 * GET /api/v1/auth/metrics
 */
router.get(
  '/metrics',
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  asyncHandler(authMiddlewareController.getMetrics.bind(authMiddlewareController))
);

export { router as authMiddlewareRoutes };
