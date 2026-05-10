import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsControllerEnhanced';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';

const router = Router();
const controller = new AnalyticsController();

router.use(requireAuth);

router.get('/dashboard/red-flags', requireRole(['admin']), asyncHandler((req, res) => controller.getRedFlags(req, res)));
router.get(
  '/dashboard/founder-operating-system',
  requireRole(['admin']),
  asyncHandler((req, res) => controller.getFounderOperatingSystem(req, res))
);

export default router;
