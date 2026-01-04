import express from 'express';
import adminRoutes from './admin';
import sellerRoutes from './seller';
import courierRoutes from './courier';
import supplierRoutes from './supplier';
import enablerRoutes from './enabler';

const router = express.Router();

// Console-specific API routes
router.use('/admin', adminRoutes);
router.use('/seller', sellerRoutes);
router.use('/courier', courierRoutes);
router.use('/supplier', supplierRoutes);
router.use('/enabler', enablerRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    services: {
      admin: 'operational',
      seller: 'operational', 
      courier: 'operational',
      supplier: 'operational',
      enabler: 'operational'
    }
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    documentation: {
      admin: '/api/admin - Admin Console APIs (user management, KYC, compliance, finance, system)',
      seller: '/api/seller - Seller Console APIs (products, orders, customers, marketing, analytics)',
      courier: '/api/courier - Courier Console APIs (deliveries, routes, performance, earnings, vehicle)',
      supplier: '/api/supplier - Supplier Console APIs (production, bulk-fulfillment, wholesale-pricing, payments)',
      enabler: '/api/enabler - Enabler Console APIs (tasks, seller-onboarding, performance, earnings, training)'
    }
  });
});

export default router;