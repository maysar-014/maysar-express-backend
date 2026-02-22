import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsControllerEnhanced';

const router = Router();
const controller = new AnalyticsController();

// Dashboard endpoints
router.get('/seller-profitability/dashboard', (req, res) => controller.getSellerProfitabilityDashboard(req, res));
router.get('/seller-profitability/dashboard/:sellerId', (req, res) => controller.getSellerProfitabilityDashboard(req, res));

// Section-specific endpoints
router.get('/seller-profitability/revenue-health', (req, res) => controller.getRevenueHealth(req, res));
router.get('/seller-profitability/growth-indicators', (req, res) => controller.getGrowthIndicators(req, res));
router.get('/seller-profitability/retention', (req, res) => controller.getRetentionMetrics(req, res));
router.get('/seller-profitability/financial', (req, res) => controller.getFinancialMetrics(req, res));
router.get('/seller-profitability/happiness', (req, res) => controller.getHappinessSignals(req, res));

// Admin endpoints
router.get('/admin/dashboard/red-flags', (req, res) => controller.getRedFlags(req, res));

export default router;
