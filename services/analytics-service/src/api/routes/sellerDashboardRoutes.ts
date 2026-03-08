import { Router, Request, Response, NextFunction } from 'express';
import { SellerDashboardController } from '../controllers/SellerDashboardController';

const router = Router();
const controller = new SellerDashboardController();

// Auth middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
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
  const userId = req.user?.userId;
  const userRole = req.user?.roles?.[0];

  if (userRole !== 'SELLER') {
    return res.status(403).json({ error: 'Only sellers can access this resource' });
  }

  if (userId !== sellerId) {
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

export default router;
