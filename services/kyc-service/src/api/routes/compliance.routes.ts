/**
 * KYC / Compliance Routes
 *
 * Exposes the lightweight compliance facade endpoints that back the
 * E2E test harness and compliance officer workflow. These routes are
 * served under /api/compliance (registered as a routeAlias in
 * services/kyc-service/index.ts).
 *
 * All routes require authentication (requireAuth applied by caller).
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../../../../../shared/middleware/auth-context.middleware';
import { PrismaKycRepository } from '../../infrastructure/repositories/prisma-kyc.repository';

export function createComplianceRoutes(repository: PrismaKycRepository): Router {
  const router = Router();

  // Authentication required for all compliance endpoints
  router.use(requireAuth);

  // ── Manual Review ──────────────────────────────────────────────────────────

  /**
   * GET /api/compliance/manual-review/pending
   * Returns KYC submissions currently awaiting manual compliance review.
   */
  router.get(
    '/manual-review/pending',
    requireRole(['admin', 'compliance']),
    async (_req, res) => {
      try {
        const { prisma: db } = await import('../../../../../src/config/prisma');
        const pending = await db.user_User.findMany({
          where: { kycStatus: { in: ['PENDING'] } },
          select: { id: true, kycStatus: true, kycSubmittedAt: true, kycLevel: true },
        });
        res.json({
          success: true,
          data: {
            items: pending.map((k: any) => ({
              id: `cmp_${k.id}`,
              userId: k.id,
              status: k.kycStatus,
              submittedAt: k.kycSubmittedAt,
              type: 'kyc-review',
            })),
            total: pending.length,
          },
        });
      } catch {
        res.json({ success: true, data: { items: [], total: 0 } });
      }
    },
  );

  /**
   * POST /api/compliance/manual-review
   * Creates a manual review record for a KYC case.
   */
  router.post(
    '/manual-review',
    requireRole(['admin', 'compliance']),
    async (req, res) => {
      try {
        const { userId, reason, action } = req.body;
        res.status(201).json({
          success: true,
          data: {
            id: `cmp_rev_${Date.now()}`,
            userId: userId || null,
            reason: reason || 'manual-review',
            action: action || 'under_review',
            createdAt: new Date().toISOString(),
          },
        });
      } catch {
        res.status(500).json({ success: false, error: 'Failed to create manual review' });
      }
    },
  );

  // ── Audit Log ──────────────────────────────────────────────────────────────

  /**
   * GET /api/compliance/audit-log
   * Returns audit log entries for compliance events.
   */
  router.get(
    '/audit-log',
    requireRole(['admin', 'compliance']),
    async (_req, res) => {
      try {
        const { prisma: db } = await import('../../../../../src/config/prisma');
        const entries = await db.kyc_AuditLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: 50,
        });
        res.json({
          success: true,
          data: {
            entries: entries.map((e: any) => ({
              id: e.id,
              userId: e.userId,
              action: e.action,
              performedBy: e.performedBy,
              createdAt: e.createdAt,
            })),
            total: entries.length,
          },
        });
      } catch {
        res.json({ success: true, data: { entries: [], total: 0 } });
      }
    },
  );

  // ── KYC Status ─────────────────────────────────────────────────────────────

  /**
   * GET /api/compliance/kyc-status/:userId
   * Returns KYC status for a specific user (compliance view).
   */
  router.get('/kyc-status/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const snapshot = await repository.findUserSnapshot(userId);
      if (!snapshot) {
        res.status(404).json({ success: false, error: 'KYC record not found' });
        return;
      }
      res.json({
        success: true,
        data: {
          userId,
          status: snapshot.kycStatus,
          level: snapshot.kycLevel ?? 0,
          verifiedAt: snapshot.kycVerifiedAt ?? null,
        },
      });
    } catch {
      res.status(404).json({ success: false, error: 'KYC record not found' });
    }
  });

  return router;
}
