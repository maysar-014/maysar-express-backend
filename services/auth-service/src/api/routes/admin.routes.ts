import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { isSystemId } from '@shared/ids/id';
import { requireRole } from '@shared/middleware/auth-context.middleware';

const router = Router();
const SAFE_VISIBLE_STRING_PATTERN = new RegExp('^(?=.*\\S)[^\\u0000-\\u001F\\u007F-\\u009F]+$', 'u');
router.use(requireRole(['admin']));
const requireSystemId = (paramName: string) => (req: any, res: any, next: any) => {
  const value = typeof req.params?.[paramName] === 'string' ? req.params[paramName].trim() : '';
  if (!isSystemId(value)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `${paramName} must be a valid ID`
      }
    });
    return;
  }
  next();
};

/**
 * Admin Routes
 * All routes are prefixed with /api/v1/admin in main.ts
 * These routes require admin/system permissions
 */

// ============================================================================
// USER MANAGEMENT (ADMIN)
// ============================================================================

/**
 * Search users (admin)
 * GET /api/v1/admin/users/search
 */
router.get(
  '/users/search',
  validateRequest({
    query: {
      query: { type: 'string', required: false },
      role: { type: 'string', required: false, enum: ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'system'] },
      status: { type: 'string', required: false, enum: ['active', 'suspended', 'deactivated', 'locked', 'pending_verification'] },
      limit: { type: 'number', required: false, integer: true, min: 1, max: 100 },
      offset: { type: 'number', required: false, integer: true, min: 0 }
    }
  }),
  asyncHandler(adminController.searchUsers.bind(adminController))
);

/**
 * Get user by ID (admin)
 * GET /api/v1/admin/users/:userId
 */
router.get(
  '/users/:userId',
  requireSystemId('userId'),
  validateRequest({
    params: {
      userId: { type: 'string', required: true }
    }
  }),
  asyncHandler(adminController.getUser.bind(adminController))
);

/**
 * Update user status (admin)
 * PATCH /api/v1/admin/users/:userId/status
 */
router.patch(
  '/users/:userId/status',
  requireSystemId('userId'),
  validateRequest({
    params: {
      userId: { type: 'string', required: true }
    },
    body: {
      status: {
        type: 'string',
        required: true,
        enum: ['active', 'suspended', 'deactivated', 'locked']
      },
      reason: { type: 'string', required: false, pattern: SAFE_VISIBLE_STRING_PATTERN }
    }
  }),
  asyncHandler(adminController.updateUserStatus.bind(adminController))
);

/**
 * Update user role (admin)
 * PATCH /api/v1/admin/users/:userId/role
 */
router.patch(
  '/users/:userId/role',
  requireSystemId('userId'),
  validateRequest({
    params: {
      userId: { type: 'string', required: true }
    },
    body: {
      role: {
        type: 'string',
        required: true,
        enum: ['buyer', 'seller', 'supplier', 'courier', 'enabler']
      },
      reason: { type: 'string', required: false, pattern: SAFE_VISIBLE_STRING_PATTERN }
    }
  }),
  asyncHandler(adminController.updateUserRole.bind(adminController))
);

// ============================================================================
// SESSION MANAGEMENT (ADMIN)
// ============================================================================

/**
 * Get user sessions (admin)
 * GET /api/v1/admin/users/:userId/sessions
 */
router.get(
  '/users/:userId/sessions',
  requireSystemId('userId'),
  validateRequest({
    params: {
      userId: { type: 'string', required: true }
    }
  }),
  asyncHandler(adminController.getUserSessions.bind(adminController))
);

/**
 * Terminate user sessions (admin)
 * DELETE /api/v1/admin/users/:userId/sessions
 */
router.delete(
  '/users/:userId/sessions',
  requireSystemId('userId'),
  validateRequest({
    params: {
      userId: { type: 'string', required: true }
    },
    body: {
      reason: { type: 'string', required: false, pattern: SAFE_VISIBLE_STRING_PATTERN }
    }
  }),
  asyncHandler(adminController.terminateUserSessions.bind(adminController))
);

/**
 * Terminate specific session (admin)
 * DELETE /api/v1/admin/sessions/:sessionId
 */
router.delete(
  '/sessions/:sessionId',
  requireSystemId('sessionId'),
  validateRequest({
    params: {
      sessionId: { type: 'string', required: true }
    },
    body: {
      reason: { type: 'string', required: false, pattern: SAFE_VISIBLE_STRING_PATTERN }
    }
  }),
  asyncHandler(adminController.terminateSession.bind(adminController))
);

// ============================================================================
// AUDIT & MONITORING (ADMIN)
// ============================================================================

/**
 * Get audit logs
 * GET /api/v1/admin/audit
 */
router.get(
  '/audit',
  validateRequest({
    query: {
      userId: { type: 'string', required: false },
      action: { type: 'string', required: false },
      startDate: { type: 'string', required: false, format: 'date' },
      endDate: { type: 'string', required: false, format: 'date' },
      limit: { type: 'number', required: false, integer: true, min: 1, max: 1000 },
      offset: { type: 'number', required: false, integer: true, min: 0 }
    }
  }),
  asyncHandler(adminController.getAuditLogs.bind(adminController))
);

/**
 * Get security events
 * GET /api/v1/admin/security-events
 */
router.get(
  '/security-events',
  validateRequest({
    query: {
      hours: { type: 'number', required: false, integer: true, min: 1, max: 168 },
      severity: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'critical'] },
      limit: { type: 'number', required: false, integer: true, min: 1, max: 1000 }
    }
  }),
  asyncHandler(adminController.getSecurityEvents.bind(adminController))
);

// ============================================================================
// SYSTEM MANAGEMENT (ADMIN)
// ============================================================================

/**
 * Get system statistics
 * GET /api/v1/admin/stats
 */
router.get(
  '/stats',
  requireRole(['admin']),
  asyncHandler(adminController.getSystemStats.bind(adminController))
);

/**
 * Force service discovery refresh
 * POST /api/v1/admin/discovery/refresh
 */
router.post(
  '/discovery/refresh',
  asyncHandler(adminController.refreshServiceDiscovery.bind(adminController))
);

/**
 * Get service health overview
 * GET /api/v1/admin/health
 */
router.get(
  '/health',
  requireRole(['admin']),
  asyncHandler(adminController.getServiceHealth.bind(adminController))
);

/**
 * Admin phone verification bypass
 * PATCH /api/v1/admin/users/:userId/verify-phone
 * Marks isPhoneVerified=true for any user without requiring Firebase OTP.
 * Used by E2E setup scripts and admin tooling.
 */
router.patch(
  '/users/:userId/verify-phone',
  requireSystemId('userId'),
  asyncHandler(adminController.verifyPhone.bind(adminController))
);

export { router as adminRoutes };
