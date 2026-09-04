/**
 * Master Order Routes
 *
 * Buyer-only routes for viewing master orders (multi-seller checkout results).
 * Mounted at /api/orders in the order-service module.
 *
 * GET /api/orders/master           — paginated list of buyer's master orders
 * GET /api/orders/master/:id       — single master order with all seller sub-orders
 */

import { Router } from 'express';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { MasterOrderController } from '../controllers/master-order.controller';

const controller = new MasterOrderController();

export const masterOrderRoutes = Router();

// Block seller-authenticated callers at the route level
masterOrderRoutes.use(requireAuth);
masterOrderRoutes.use((req, res, next) => {
  const authUser = (req as any).user;
  const roles: string[] = [
    ...(Array.isArray(authUser?.roles) ? authUser.roles : []),
    authUser?.role,
    authUser?.activeRole,
  ]
    .filter((r): r is string => typeof r === 'string')
    .map(r => r.trim().toLowerCase());

  // Sellers and couriers cannot access master order endpoints
  const isSellerOnly = roles.includes('seller') && !roles.includes('admin') && !roles.includes('system');
  const isCourier = roles.includes('courier') && !roles.includes('admin');

  if (isSellerOnly || isCourier) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This endpoint is only accessible to buyers' } });
    return;
  }
  next();
});

masterOrderRoutes.get('/master', (req, res) => controller.listMasterOrders(req, res));
masterOrderRoutes.get('/master/:masterOrderId', (req, res) => controller.getMasterOrder(req, res));
