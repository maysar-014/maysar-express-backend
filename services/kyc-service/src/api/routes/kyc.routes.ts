import { Router } from 'express';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';
import { submitKycBodySchema, adminVerifyKycBodySchema } from '../validators/kyc.validator';
import { KycController } from '../controllers/kyc.controller';
import { KycAdminController } from '../controllers/kyc-admin.controller';

export const createKycRoutes = (controller: KycController, adminController: KycAdminController): Router => {
  const router = Router();
  router.use(requireAuth);

  router.post(
    '/submit',
    validateJoiRequest({ body: submitKycBodySchema }),
    asyncHandler((req, res) => controller.submitKyc(req, res))
  );

  router.get(
    '/status',
    asyncHandler((req, res) => controller.getStatus(req, res))
  );

  router.patch(
    '/admin/:userId',
    requireRoleOrService(['admin']),
    validateJoiRequest({ body: adminVerifyKycBodySchema }),
    asyncHandler((req, res) => adminController.verifyKyc(req, res))
  );

  // GET /admin/pending — list pending KYC submissions for admin review
  router.get(
    '/admin/pending',
    requireRoleOrService(['admin']),
    asyncHandler(async (req, res) => {
      const { prisma } = await import('../../infrastructure/database/prisma-client');
      const pending = await (prisma as any).kyc_KycRecord?.findMany?.({
        where: { status: { in: ['PENDING', 'pending'] } },
        orderBy: { submittedAt: 'desc' },
        take: 50
      }) ?? [];
      res.json({ success: true, data: pending, total: pending.length });
    })
  );

  // GET /admin/:userId — read KYC status for a specific user (admin)
  router.get(
    '/admin/:userId',
    requireRoleOrService(['admin']),
    asyncHandler(async (req, res) => {
      const { prisma } = await import('../../infrastructure/database/prisma-client');
      const record = await (prisma as any).kyc_KycRecord?.findFirst?.({
        where: { userId: req.params.userId },
        orderBy: { submittedAt: 'desc' }
      }) ?? null;
      if (!record) {
        res.status(404).json({ success: false, error: 'KYC record not found' });
        return;
      }
      res.json({ success: true, data: record });
    })
  );

  return router;
};

