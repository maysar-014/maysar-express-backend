import { Request, Response } from 'express';
import { Actor, StockOutReconciliation } from '../stock-out/stockOutReconciliation';

const idempotencyKey = (req: Request): string | undefined => {
  const value = req.header('Idempotency-Key');
  return value?.trim() || undefined;
};

const actorFrom = (req: Request): Actor => ({
  userId: req.user!.userId,
  roles: req.user!.roles || []
});

export class StockOutApi {
  constructor(private readonly reconciliation: StockOutReconciliation) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const stockOut = await this.reconciliation.createPendingStockOut(actorFrom(req), {
        warehouseId: req.body?.warehouseId,
        productVariantId: req.body?.productVariantId,
        quantity: Number(req.body?.quantity),
        reason: req.body?.reason,
        occurredAt: req.body?.occurredAt,
        idempotencyKey: idempotencyKey(req) || ''
      });
      res.status(201).json({ stockOut });
    } catch (error: any) {
      this.respond(error, res);
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      res.json({ stockOuts: await this.reconciliation.listPendingStockOuts(actorFrom(req), status) });
    } catch (error: any) {
      this.respond(error, res);
    }
  }

  async reconcile(req: Request, res: Response): Promise<void> {
    try {
      const order = await this.reconciliation.reconcile(actorFrom(req), {
        buyerId: req.body?.buyerId,
        paymentMethod: req.body?.paymentMethod,
        paymentReference: req.body?.paymentReference,
        notes: req.body?.notes,
        lines: req.body?.lines,
        idempotencyKey: idempotencyKey(req) || ''
      });
      res.status(201).json({ order, inventoryAlreadyDeducted: true });
    } catch (error: any) {
      this.respond(error, res);
    }
  }

  private respond(error: Error, res: Response): void {
    const message = error.message || 'Unable to process stock-out request';
    const clientError = /required|must be|Unsupported|Insufficient|not found|do not exist|cannot manage|not a seller location|one seller location|no longer available|missing product variant|different operation/i.test(message);
    res.status(clientError ? 400 : 500).json({ error: message });
  }
}
