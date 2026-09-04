import { Request, Response } from 'express';
import { SellerVerifyStockUseCase } from '../../application/use-cases/seller-verify-stock.use-case';
import { SellerDeclineStockUseCase } from '../../application/use-cases/seller-decline-stock.use-case';
import { BuyerConfirmCheckoutUseCase } from '../../application/use-cases/buyer-confirm-checkout.use-case';
import { AdminOrderActionsUseCase } from '../../application/use-cases/admin-order-actions.use-case';
import { AdminQueryUseCase } from '../../application/use-cases/admin-query.use-case';

function getActorId(req: Request): string | undefined {
  return (req as any).user?.userId || (req as any).user?.id;
}

function mapError(error: unknown): { status: number; code: string; message: string; allowedTransitions?: string[] } {
  const err = error as any;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const code = typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  return { status, code, message, allowedTransitions: err.allowedTransitions };
}

export class VerificationController {
  constructor(
    private readonly sellerVerifyUseCase: SellerVerifyStockUseCase,
    private readonly sellerDeclineUseCase: SellerDeclineStockUseCase,
    private readonly buyerConfirmCheckoutUseCase: BuyerConfirmCheckoutUseCase,
    private readonly adminActionsUseCase: AdminOrderActionsUseCase,
    private readonly adminQueryUseCase: AdminQueryUseCase,
  ) {}

  // POST /orders/:id/verify — seller confirms stock
  async sellerVerify(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = getActorId(req);
      if (!sellerId) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' }); return; }
      const result = await this.sellerVerifyUseCase.execute({ orderId: req.params.id, sellerId });
      res.status(200).json({
        success: true,
        data: {
          id: result.orderId,
          status: 'SELLER_CONFIRMED',
          checkoutAvailable: true,
          checkoutPath: 'FULL_PAYMENT',
          updatedAt: new Date().toISOString(),
          ...result
        }
      });
    } catch (err) {
      const { status, code, message, allowedTransitions } = mapError(err);
      res.status(status).json({ error: code, message, ...(allowedTransitions ? { allowedTransitions } : {}) });
    }
  }

  // POST /orders/:id/decline — seller declines stock
  async sellerDecline(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = getActorId(req);
      if (!sellerId) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' }); return; }
      const result = await this.sellerDeclineUseCase.execute({
        orderId: req.params.id,
        sellerId,
        reason: req.body?.reason,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      const { status, code, message, allowedTransitions } = mapError(err);
      res.status(status).json({ error: code, message, ...(allowedTransitions ? { allowedTransitions } : {}) });
    }
  }

  // POST /orders/:id/buyer/confirm-checkout — buyer confirms checkout after seller verified
  async buyerConfirmCheckout(req: Request, res: Response): Promise<void> {
    try {
      const buyerId = getActorId(req);
      if (!buyerId) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' }); return; }
      const result = await this.buyerConfirmCheckoutUseCase.execute({ orderId: req.params.id, buyerId });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      const { status, code, message, allowedTransitions } = mapError(err);
      res.status(status).json({ error: code, message, ...(allowedTransitions ? { allowedTransitions } : {}) });
    }
  }

  // POST /orders/:id/admin/approve
  async adminApprove(req: Request, res: Response): Promise<void> {
    await this.handleAdminAction(req, res, 'approve');
  }

  // POST /orders/:id/admin/cancel
  async adminCancel(req: Request, res: Response): Promise<void> {
    await this.handleAdminAction(req, res, 'cancel');
  }

  // POST /orders/:id/admin/review
  async adminPlaceUnderReview(req: Request, res: Response): Promise<void> {
    await this.handleAdminAction(req, res, 'placeUnderReview');
  }

  // POST /orders/:id/admin/override — force any status with mandatory reason
  async adminOverride(req: Request, res: Response): Promise<void> {
    try {
      const adminId = getActorId(req);
      if (!adminId) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' }); return; }
      const { reason, notes, targetStatus } = req.body ?? {};
      if (!reason || String(reason).trim().length === 0) {
        res.status(422).json({ error: 'VALIDATION_ERROR', message: 'reason is required for admin override' });
        return;
      }
      if (!targetStatus || String(targetStatus).trim().length === 0) {
        res.status(422).json({ error: 'VALIDATION_ERROR', message: 'targetStatus is required for admin override' });
        return;
      }
      const result = await this.adminActionsUseCase.execute({
        orderId: req.params.id,
        adminId,
        action: 'override',
        reason: String(reason).trim(),
        notes: notes ? String(notes) : undefined,
        targetStatus: String(targetStatus).trim().toUpperCase(),
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      const { status, code, message } = mapError(err);
      res.status(status).json({ error: code, message });
    }
  }

  // GET /orders/admin/pending-verification
  async getPendingVerification(req: Request, res: Response): Promise<void> {
    try {
      const orders = await this.adminQueryUseCase.getPendingVerificationOrders();
      res.status(200).json({ success: true, data: { orders, total: orders.length } });
    } catch (err) {
      const { status, code, message } = mapError(err);
      res.status(status).json({ error: code, message });
    }
  }

  // GET /orders/admin/overdue
  async getOverdue(req: Request, res: Response): Promise<void> {
    try {
      const orders = await this.adminQueryUseCase.getOverdueOrders();
      res.status(200).json({ success: true, data: { orders, total: orders.length } });
    } catch (err) {
      const { status, code, message } = mapError(err);
      res.status(status).json({ error: code, message });
    }
  }

  // GET /orders/:id/history
  async getOrderHistory(req: Request, res: Response): Promise<void> {
    try {
      const entries = await this.adminQueryUseCase.getOrderHistory(req.params.id);
      res.status(200).json({ success: true, data: { entries, total: entries.length } });
    } catch (err) {
      const { status, code, message } = mapError(err);
      res.status(status).json({ error: code, message });
    }
  }

  private async handleAdminAction(req: Request, res: Response, action: 'approve' | 'cancel' | 'placeUnderReview'): Promise<void> {
    try {
      const adminId = getActorId(req);
      if (!adminId) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' }); return; }
      const result = await this.adminActionsUseCase.execute({
        orderId: req.params.id,
        adminId,
        action,
        reason: req.body?.reason,
        notes: req.body?.notes,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      const { status, code, message, allowedTransitions } = mapError(err);
      res.status(status).json({ error: code, message, ...(allowedTransitions ? { allowedTransitions } : {}) });
    }
  }
}
