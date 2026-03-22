import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsControllerEnhanced';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';

const router = Router();
const controller = new AnalyticsController();

router.use(requireAuth);

// Dashboard endpoints
router.get('/seller-profitability/dashboard', asyncHandler((req, res) => controller.getSellerProfitabilityDashboard(req, res)));
router.get('/seller-profitability/dashboard/:sellerId', asyncHandler((req, res) => controller.getSellerProfitabilityDashboard(req, res)));

// Section-specific endpoints
router.get('/seller-profitability/revenue-health', asyncHandler((req, res) => controller.getRevenueHealth(req, res)));
router.get('/seller-profitability/growth-indicators', asyncHandler((req, res) => controller.getGrowthIndicators(req, res)));
router.get('/seller-profitability/retention', asyncHandler((req, res) => controller.getRetentionMetrics(req, res)));
router.get('/seller-profitability/financial', asyncHandler((req, res) => controller.getFinancialMetrics(req, res)));
router.get('/seller-profitability/happiness', asyncHandler((req, res) => controller.getHappinessSignals(req, res)));

// Admin endpoints
router.get('/admin/dashboard/red-flags', requireRole(['admin']), asyncHandler((req, res) => controller.getRedFlags(req, res)));

export default router;
