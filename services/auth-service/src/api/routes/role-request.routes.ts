import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { makeId } from '@shared/ids/id';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const requestableRoles = ['seller', 'supplier', 'courier', 'enabler'] as const;
const requestStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
const SYSTEM_ID_PATTERN = '^[a-z]{2,6}(?:_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}$';

const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) return [];
  return roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
};

export function createRoleRequestRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.use(requireAuth);

  router.post(
    '/role-requests',
    validateRequest({
      body: {
        role: { type: 'string', required: true, enum: [...requestableRoles] },
        justification: { type: 'string', required: false, minLength: 10, maxLength: 1000 }
      }
    }),
    async (req: any, res) => {
      try {
        const authUser = req.user;
        const userId = authUser?.userId || authUser?.id;
        const requestedRole = String(req.body?.role || '').trim().toLowerCase();
        const justification = typeof req.body?.justification === 'string'
          ? req.body.justification.trim()
          : null;
        const assignedRoles = normalizeRoles(authUser?.roles);

        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
          });
          return;
        }

        if (assignedRoles.includes(requestedRole)) {
          res.status(409).json({
            success: false,
            error: {
              code: 'ROLE_ALREADY_ASSIGNED',
              message: 'Requested role is already assigned to the authenticated user'
            }
          });
          return;
        }

        const existingPendingRequest = await prisma.auth_RoleRequest.findFirst({
          where: {
            userId,
            requestedRole,
            status: 'PENDING'
          }
        });

        if (existingPendingRequest) {
          res.status(409).json({
            success: false,
            error: {
              code: 'ROLE_REQUEST_EXISTS',
              message: 'A pending request already exists for this role'
            }
          });
          return;
        }

        const requestRecord = await prisma.auth_RoleRequest.create({
          data: {
            id: makeId('ath_rreq'),
            userId,
            requestedRole,
            status: 'PENDING',
            justification,
            metadata: {
              submittedFrom: 'auth-service',
              submittedByRoles: assignedRoles
            }
          }
        });

        res.status(201).json({
          success: true,
          data: {
            id: requestRecord.id,
            userId: requestRecord.userId,
            requestedRole: requestRecord.requestedRole,
            status: requestRecord.status,
            justification: requestRecord.justification,
            createdAt: requestRecord.createdAt
          },
          message: 'Role request submitted successfully'
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: {
            code: 'ROLE_REQUEST_FAILED',
            message: error?.message || 'Failed to submit role request'
          }
        });
      }
    }
  );

  router.get(
    '/role-requests',
    validateRequest({
      query: {
        status: { type: 'string', required: false, enum: [...requestStatuses] },
        userId: { type: 'string', required: false, pattern: SYSTEM_ID_PATTERN }
      }
    }),
    async (req: any, res) => {
      try {
        const authUser = req.user;
        const requesterUserId = authUser?.userId || authUser?.id;
        const requesterRoles = normalizeRoles(authUser?.roles);
        const isPrivileged = requesterRoles.includes('admin') || requesterRoles.includes('system');
        const targetUserId = isPrivileged && typeof req.query?.userId === 'string'
          ? req.query.userId
          : requesterUserId;

        if (!targetUserId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
          });
          return;
        }

        const items = await prisma.auth_RoleRequest.findMany({
          where: {
            userId: targetUserId,
            ...(typeof req.query?.status === 'string' ? { status: req.query.status } : {})
          },
          orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
          success: true,
          data: {
            items: items.map((item) => ({
              id: item.id,
              userId: item.userId,
              requestedRole: item.requestedRole,
              status: item.status,
              justification: item.justification,
              reviewedAt: item.reviewedAt,
              reviewedBy: item.reviewedBy,
              reviewNotes: item.reviewNotes,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }))
          }
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: {
            code: 'ROLE_REQUEST_LOOKUP_FAILED',
            message: error?.message || 'Failed to load role requests'
          }
        });
      }
    }
  );

  return router;
}
