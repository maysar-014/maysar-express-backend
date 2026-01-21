import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireRole } from '../middleware/validation.middleware';

const router = Router();

/**
 * User Management Routes
 * All routes are prefixed with /api/v1 in main.ts
 */

// ============================================================================
// USER CRUD OPERATIONS
// ============================================================================

/**
 * Create a new user account
 * POST /api/v1/users
 */
router.post(
  '/',
  validateRequest({
    body: {
      email: { type: 'string', required: true, format: 'email' },
      password: { type: 'string', required: true, minLength: 8 },
      firstName: { type: 'string', required: false, maxLength: 50 },
      lastName: { type: 'string', required: false, maxLength: 50 },
      phoneNumber: { type: 'string', required: false },
      dateOfBirth: { type: 'string', required: false, format: 'date' },
      role: { type: 'string', required: false, enum: ['BUYER', 'SELLER', 'COURIER', 'SUPPLIER', 'ENABLER'] }
    }
  }),
  asyncHandler(userController.createUser.bind(userController))
);

/**
 * Get user by ID
 * GET /api/v1/users/:userId
 */
router.get(
  '/:userId',
  validateRequest({
    params: {
      userId: { type: 'string', required: true, pattern: /^[a-zA-Z0-9_-]+$/ }
    },
    query: {
      fields: { type: 'string', required: false }
    }
  }),
  asyncHandler(userController.getUser.bind(userController))
);

/**
 * Update user profile
 * PUT /api/v1/users/:userId
 */
router.put(
  '/:userId',
  validateRequest({
    params: {
      userId: { type: 'string', required: true, pattern: /^[a-zA-Z0-9_-]+$/ }
    },
    body: {
      firstName: { type: 'string', required: false, maxLength: 50 },
      lastName: { type: 'string', required: false, maxLength: 50 },
      phoneNumber: { type: 'string', required: false },
      dateOfBirth: { type: 'string', required: false, format: 'date' },
      avatar: { type: 'string', required: false, format: 'uri' },
      language: { type: 'string', required: false, enum: ['en', 'sw', 'fr', 'ar'] },
      timezone: { type: 'string', required: false },
      notificationsEnabled: { type: 'boolean', required: false }
    }
  }),
  asyncHandler(userController.updateUser.bind(userController))
);

/**
 * Delete user account (Admin only)
 * DELETE /api/v1/users/:userId
 */
router.delete(
  '/:userId',
  requireRole('SYSTEM', 'ENABLER'),
  validateRequest({
    params: {
      userId: { type: 'string', required: true, pattern: /^[a-zA-Z0-9_-]+$/ }
    }
  }),
  asyncHandler(userController.deleteUser.bind(userController))
);

// ============================================================================
// USER VERIFICATION OPERATIONS
// ============================================================================

/**
 * Verify user email
 * POST /api/v1/users/:userId/verify-email
 */
router.post(
  '/:userId/verify-email',
  validateRequest({
    params: {
      userId: { type: 'string', required: true, pattern: /^[a-zA-Z0-9_-]+$/ }
    },
    body: {
      verificationToken: { type: 'string', required: true, minLength: 32, maxLength: 128 }
    }
  }),
  asyncHandler(userController.verifyEmail.bind(userController))
);

// ============================================================================
// USER SEARCH AND LISTING
// ============================================================================

/**
 * Search users with advanced filtering
 * GET /api/v1/users/search
 */
router.get(
  '/search',
  requireRole('SYSTEM', 'ENABLER', 'SELLER'),
  validateRequest({
    query: {
      query: { type: 'string', required: false, maxLength: 100 },
      role: { type: 'string', required: false, enum: ['BUYER', 'SELLER', 'COURIER', 'SUPPLIER', 'ENABLER'] },
      status: { type: 'string', required: false, enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'LOCKED'] },
      emailVerified: { type: 'string', required: false, enum: ['true', 'false'] },
      phoneVerified: { type: 'string', required: false, enum: ['true', 'false'] },
      createdAfter: { type: 'string', required: false, format: 'date' },
      createdBefore: { type: 'string', required: false, format: 'date' },
      page: { type: 'string', required: false, pattern: /^\d+$/, min: 1 },
      limit: { type: 'string', required: false, pattern: /^\d+$/, min: 1, max: 100 },
      sortBy: { type: 'string', required: false, enum: ['createdAt', 'email', 'firstName', 'lastName'] },
      sortOrder: { type: 'string', required: false, enum: ['asc', 'desc'] }
    }
  }),
  asyncHandler(userController.searchUsers.bind(userController))
);

// ============================================================================
// USER STATISTICS AND METRICS
// ============================================================================

/**
 * Get user statistics (Admin only)
 * GET /api/v1/users/stats
 */
router.get(
  '/stats',
  requireRole('SYSTEM', 'ENABLER'),
  asyncHandler(userController.getUserStats.bind(userController))
);

// ============================================================================
// USER PROFILE OPERATIONS (Self-service)
// ============================================================================

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
router.get(
  '/me',
  validateRequest({}),
  asyncHandler(async (req, res) => {
    // This would use authentication middleware to get current user
    // For now, redirect to user controller with authenticated user ID
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    req.params.userId = userId;
    return userController.getUser(req, res, () => {});
  })
);

/**
 * Update current user profile
 * PUT /api/v1/users/me
 */
router.put(
  '/me',
  validateRequest({
    body: {
      firstName: { type: 'string', required: false, maxLength: 50 },
      lastName: { type: 'string', required: false, maxLength: 50 },
      phoneNumber: { type: 'string', required: false },
      dateOfBirth: { type: 'string', required: false, format: 'date' },
      avatar: { type: 'string', required: false, format: 'uri' },
      language: { type: 'string', required: false, enum: ['en', 'sw', 'fr', 'ar'] },
      timezone: { type: 'string', required: false },
      notificationsEnabled: { type: 'boolean', required: false }
    }
  }),
  asyncHandler(async (req, res) => {
    // This would use authentication middleware to get current user
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    req.params.userId = userId;
    return userController.updateUser(req, res, () => {});
  })
);

export { router as userRoutes };
