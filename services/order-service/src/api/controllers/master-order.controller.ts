/**
 * MasterOrderController
 *
 * Buyer-only endpoints for master order management.
 * Sellers are explicitly blocked from all master order endpoints.
 *
 * GET /api/orders/master          — paginated list of buyer's master orders
 * GET /api/orders/master/:id      — single master order with all seller sub-orders
 *
 * Virtual master orders (legacy single-seller orders with no master order record)
 * are served with prefix VIRTUAL-{orderId} and isVirtual: true.
 */

import { Request, Response } from 'express';
import { PrismaMasterOrderRepository } from '../../infrastructure/repositories/prisma-master-order.repository';
import { deriveMasterOrderStatus } from '../../domain/engines/master-order-status.engine';

const masterOrderRepo = new PrismaMasterOrderRepository();
function getAuthUserId(req: Request): string | undefined {
  const authUser = (req as any).user;
  return authUser?.userId || authUser?.id || authUser?.sub;
}

function getAuthRoles(req: Request): string[] {
  const authUser = (req as any).user;
  const roleValues = [
    ...(Array.isArray(authUser?.roles) ? authUser.roles : []),
    authUser?.role,
    authUser?.activeRole,
  ];
  return roleValues
    .filter((r): r is string => typeof r === 'string')
    .map(r => r.trim().toLowerCase());
}

function isSeller(req: Request): boolean {
  const roles = getAuthRoles(req);
  return roles.includes('seller') && !roles.includes('admin') && !roles.includes('system');
}

export class MasterOrderController {

  /**
   * GET /api/orders/master
   * Returns paginated list of master orders for the authenticated buyer.
   */
  async listMasterOrders(req: Request, res: Response): Promise<void> {
    if (isSeller(req)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Sellers cannot access master order endpoints' } });
      return;
    }

    const buyerId = getAuthUserId(req);
    if (!buyerId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));

    try {
      const result = await masterOrderRepo.findByBuyerId(buyerId, page, pageSize);
      res.json({
        success: true,
        data: {
          items: result.items,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err?.message } });
    }
  }

  /**
   * GET /api/orders/master/:masterOrderId
   * Returns a single master order with all child seller orders.
   * Handles Virtual Master Orders (prefix VIRTUAL-).
   */
  async getMasterOrder(req: Request, res: Response): Promise<void> {
    if (isSeller(req)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Sellers cannot access master order endpoints' } });
      return;
    }

    const buyerId = getAuthUserId(req);
    if (!buyerId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const { masterOrderId } = req.params;

    try {
      const masterOrder = await masterOrderRepo.findById(masterOrderId);

      if (!masterOrder) {
        res.status(404).json({ success: false, error: { code: 'MASTER_ORDER_NOT_FOUND', message: 'Master order not found' } });
        return;
      }

      if (masterOrder.buyerId !== buyerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This order does not belong to you' } });
        return;
      }

      const derivedStatus = deriveMasterOrderStatus(masterOrder.sellerOrders.map(o => o.status));

      res.json({
        success: true,
        data: {
          masterOrderId: masterOrder.masterOrderId,
          status: derivedStatus,
          totalAmount: masterOrder.totalAmount,
          currency: masterOrder.currency,
          paymentMethod: masterOrder.paymentMethod,
          createdAt: masterOrder.createdAt,
          sellerOrders: masterOrder.sellerOrders,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err?.message } });
    }
  }
}
