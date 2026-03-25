import { Router } from 'express';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { SessionEngine } from '../../domain/engines/session.engine';

const switchableRoles = ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'admin', 'system', 'user'] as const;

export function createSwitchRoleRouter(sessionEngine: SessionEngine): Router {
  const router = Router();

  router.post(
    '/switch-role',
    requireAuth,
    validateRequest({
      body: {
        role: { type: 'string', required: true, enum: [...switchableRoles] },
        deviceInfo: { type: 'string', required: false, minLength: 1, maxLength: 255 }
      }
    }),
    async (req, res) => {
      try {
        const authUser = (req as any).user;
        const userId = authUser?.userId || authUser?.id;
        const availableRoles = Array.isArray(authUser?.roles)
          ? authUser.roles.map((role: unknown) => String(role).trim().toLowerCase()).filter(Boolean)
          : [];
        const requestedRole = String(req.body?.role || '').trim().toLowerCase();

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          });
          return;
        }

        if (!availableRoles.includes(requestedRole)) {
          res.status(403).json({
            success: false,
            error: {
              code: 'ROLE_NOT_ASSIGNED',
              message: 'Requested role is not assigned to the authenticated user'
            }
          });
          return;
        }

        const forwardedFor = req.headers['x-forwarded-for'];
        const ipAddress = typeof forwardedFor === 'string'
          ? forwardedFor.split(',')[0].trim()
          : (req.ip || 'unknown');
        const deviceInfo = typeof req.body?.deviceInfo === 'string' && req.body.deviceInfo.trim()
          ? req.body.deviceInfo.trim()
          : String(req.headers['user-agent'] || 'unknown');
        const sessionId = await sessionEngine.createSession(userId, requestedRole, deviceInfo, ipAddress);

        res.status(200).json({
          success: true,
          data: {
            sessionId,
            selectedRole: requestedRole,
            availableRoles
          },
          message: 'Role switched successfully'
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: {
            code: 'ROLE_SWITCH_FAILED',
            message: error?.message || 'Failed to switch role'
          }
        });
      }
    }
  );

  return router;
}
