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

  return router;
};

