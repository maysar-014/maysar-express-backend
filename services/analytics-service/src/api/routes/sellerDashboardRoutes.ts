import { Router, Request, Response, NextFunction } from 'express';
import { SellerDashboardController } from '../controllers/SellerDashboardController';
import { ActionCenterGenerationJob } from '../../infrastructure/ActionCenterGenerationJob';
import prisma from '../../infrastructure/database/prisma';

const router = Router();
const controller = new SellerDashboardController();

const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) return [];
  return roles.map(role => String(role).toLowerCase());
};

// Auth middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userId || (req.user as any)?.id) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  // Verify JWT (assumes token is validated and decoded in req.user)
  if (!req.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
};

// Authorization middleware
const sellerAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { sellerId } = req.params;
  const userId = req.user?.userId || (req.user as any)?.id;
  const roles = normalizeRoles(req.user?.roles);
  const isAdmin = roles.includes('admin');
  const isSeller = roles.includes('seller');

  if (!isAdmin && !isSeller) {
    return res.status(403).json({ error: 'Only sellers can access this resource' });
  }

  if (!isAdmin && userId !== sellerId) {
    return res.status(403).json({ error: 'Unauthorized: Cannot access other seller data' });
  }

  next();
};

// Dashboard endpoints with auth
router.get('/sellers/:sellerId/dashboard', authMiddleware, sellerAuthMiddleware, (req, res) => controller.getSellerDashboard(req, res));
router.get('/sellers/:sellerId/dashboard/money-snapshot', authMiddleware, sellerAuthMiddleware, (req, res) => controller.getMoneySnapshot(req, res));
router.get('/sellers/:sellerId/dashboard/action-center', authMiddleware, sellerAuthMiddleware, (req, res) => controller.getActionCenter(req, res));
router.get('/sellers/:sellerId/dashboard/sales-trend', authMiddleware, sellerAuthMiddleware, (req, res) => controller.getSalesTrend(req, res));
router.get('/sellers/:sellerId/dashboard/profitability-score', authMiddleware, sellerAuthMiddleware, (req, res) => controller.getProfitabilityScore(req, res));

// Action items
router.patch('/action-items/:actionId/resolve', authMiddleware, (req, res) => controller.resolveActionItem(req, res));

// Admin-only: trigger ActionCenterGenerationJob on demand (used by lifecycle verification / ops tooling)
// POST /api/analytics/admin/jobs/action-center
router.post('/admin/jobs/action-center', authMiddleware, async (req: Request, res: Response) => {
  const roles = normalizeRoles(req.user?.roles);
  if (!roles.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }
  try {
    const activeSellers = await (prisma as any).user_User.findMany({
      where: { role: 'SELLER', status: 'ACTIVE' },
      select: { id: true },
    });
    const job = new ActionCenterGenerationJob();
    // Run for all active sellers sequentially (job already does this internally but
    // the admin trigger should return after completion so the caller can rely on results).
    await job.execute();
    return res.json({
      success: true,
      data: { sellersProcessed: activeSellers.length },
      message: 'ActionCenterGenerationJob completed',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message ?? 'Job failed' });
  }
});

export default router;
