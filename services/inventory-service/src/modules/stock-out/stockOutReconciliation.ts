import { randomUUID } from 'crypto';
import { makeOrderNumber } from '@shared/ids/human-readable-ids';

type PrismaDelegate = Record<string, (...args: any[]) => Promise<any>>;

interface ProductVariantRecord {
  id: string;
  productId: string;
  name: string | null;
  sku: string;
  weight: unknown;
}

export interface Actor {
  userId: string;
  roles: string[];
}

export interface CreateStockOutInput {
  warehouseId: string;
  productVariantId: string;
  quantity: number;
  reason: string;
  occurredAt?: string;
  idempotencyKey: string;
}

export interface ReconcileStockOutLine {
  pendingStockOutId: string;
  quantity: number;
  unitPrice: number;
}

export interface ReconcileStockOutInput {
  buyerId: string;
  paymentMethod: 'DIRECT_PAYMENT' | 'MOBILE_MONEY' | 'CARD' | 'WALLET';
  paymentReference?: string;
  notes?: string;
  lines: ReconcileStockOutLine[];
  idempotencyKey: string;
}

/**
 * Owns the only path from a physical seller stock-out to a reconciled direct
 * sale. It deliberately does not use the standard order flow because that flow
 * creates delivery work and deducts inventory later on shipment delivery.
 */
export class StockOutReconciliation {
  constructor(private readonly prisma: any) {}

  async createPendingStockOut(actor: Actor, input: CreateStockOutInput): Promise<any> {
    this.assertValidStockOut(input);

    return this.prisma.$transaction(async (tx: any) => {
      const warehouse = await this.getWarehouse(tx, input.warehouseId);
      this.assertActorCanManageWarehouse(actor, warehouse);

      const existing = await this.findRequest(tx, warehouse.sellerId, input.idempotencyKey);
      if (existing) {
        if (existing.operation !== 'STOCK_OUT') throw new Error('Idempotency key was used for a different operation');
        return tx.inventory_PendingStockOut.findUnique({ where: { id: existing.resourceId } });
      }

      await tx.inventory_ReconciliationRequest.create({
        data: {
          id: this.id('invreq'),
          sellerId: warehouse.sellerId,
          idempotencyKey: input.idempotencyKey,
          operation: 'STOCK_OUT'
        }
      });

      const update = await tx.inventory_StockItem.updateMany({
        where: {
          productVariantId: input.productVariantId,
          warehouseId: input.warehouseId,
          quantityAvailable: { gte: input.quantity }
        },
        data: {
          quantityAvailable: { decrement: input.quantity },
          version: { increment: 1 }
        }
      });
      if (update.count !== 1) throw new Error('Insufficient available stock or stock item not found');

      const movement = await tx.inventory_InventoryMovement.create({
        data: {
          id: this.id('invmv'),
          productVariantId: input.productVariantId,
          warehouseId: input.warehouseId,
          movementType: 'outbound',
          quantity: input.quantity,
          referenceType: 'pending_stock_out',
          reason: input.reason,
          performedBy: actor.userId,
          notes: 'Physical stock-out awaiting commercial reconciliation'
        }
      });

      const pendingStockOut = await tx.inventory_PendingStockOut.create({
        data: {
          id: this.id('invso'),
          sellerId: warehouse.sellerId,
          warehouseId: input.warehouseId,
          productVariantId: input.productVariantId,
          movementId: movement.id,
          quantity: input.quantity,
          remainingQuantity: input.quantity,
          reason: input.reason.trim(),
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
          performedBy: actor.userId
        }
      });
      await tx.inventory_ReconciliationRequest.update({
        where: { sellerId_idempotencyKey: { sellerId: warehouse.sellerId, idempotencyKey: input.idempotencyKey } },
        data: { resourceId: pendingStockOut.id }
      });
      return pendingStockOut;
    });
  }

  async listPendingStockOuts(actor: Actor, status?: string): Promise<any[]> {
    const where: Record<string, unknown> = { sellerId: actor.userId };
    if (this.isAdmin(actor)) delete where.sellerId;
    if (status) where.status = status;
    return this.prisma.inventory_PendingStockOut.findMany({
      where,
      orderBy: { occurredAt: 'desc' }
    });
  }

  async reconcile(actor: Actor, input: ReconcileStockOutInput): Promise<any> {
    this.assertValidReconciliation(input);

    return this.prisma.$transaction(async (tx: any) => {
      const pending = await tx.inventory_PendingStockOut.findMany({
        where: { id: { in: input.lines.map((line) => line.pendingStockOutId) } },
        orderBy: { createdAt: 'asc' }
      });
      if (pending.length !== input.lines.length) throw new Error('One or more pending stock-outs do not exist');

      const sellerId = pending[0].sellerId;
      const warehouseId = pending[0].warehouseId;
      if (pending.some((row: any) => row.sellerId !== sellerId || row.warehouseId !== warehouseId)) {
        throw new Error('A reconciliation may contain stock-outs from one seller location only');
      }
      this.assertActorCanManageWarehouse(actor, await this.getWarehouse(tx, warehouseId));

      const existing = await this.findRequest(tx, sellerId, input.idempotencyKey);
      if (existing) {
        if (existing.operation !== 'RECONCILIATION' || !existing.orderId) {
          throw new Error('Idempotency key was used for a different operation');
        }
        return tx.order_Order.findUnique({ where: { id: existing.orderId }, include: { items: true, payments: true } });
      }

      await tx.inventory_ReconciliationRequest.create({
        data: {
          id: this.id('invreq'), sellerId, idempotencyKey: input.idempotencyKey, operation: 'RECONCILIATION'
        }
      });

      const variants: ProductVariantRecord[] = await tx.productVariant.findMany({
        where: { id: { in: pending.map((row: any) => row.productVariantId) } }
      });
      if (variants.length !== pending.length) throw new Error('A pending stock-out references a missing product variant');
      const variantsById = new Map<string, ProductVariantRecord>(variants.map((variant) => [variant.id, variant]));
      const linesById = new Map(input.lines.map((line) => [line.pendingStockOutId, line]));

      for (const row of pending) {
        const line = linesById.get(row.id)!;
        const result = await tx.inventory_PendingStockOut.updateMany({
          where: { id: row.id, remainingQuantity: { gte: line.quantity }, status: { in: ['PENDING', 'PARTIALLY_RECONCILED'] } },
          data: { remainingQuantity: { decrement: line.quantity } }
        });
        if (result.count !== 1) throw new Error(`Stock-out ${row.id} is no longer available for this reconciliation`);
      }

      const orderId = makeOrderNumber();
      const totalAmount = pending.reduce((total: number, row: any) => total + linesById.get(row.id)!.quantity * linesById.get(row.id)!.unitPrice, 0);
      const totalWeight = pending.reduce((total: number, row: any) => {
        const weight = Number(variantsById.get(row.productVariantId)?.weight || 0);
        return total + weight * linesById.get(row.id)!.quantity;
      }, 0);
      const order = await tx.order_Order.create({
        data: {
          id: orderId,
          buyerId: input.buyerId,
          sellerId,
          status: 'COMPLETED',
          paymentMethod: input.paymentMethod,
          totalAmount,
          currency: 'TZS',
          totalWeight,
          deliveryAddress: { type: 'DIRECT_SALE', sellerLocationWarehouseId: warehouseId },
          orderSource: 'DIRECT',
          orderCompletionMethod: 'DIRECT_PAYMENT',
          fulfillmentLocationId: (await this.getWarehouse(tx, warehouseId)).sellerLocationId,
          isInventoryPreDeducted: true,
          stockReconciledAt: new Date()
        }
      });

      for (const row of pending) {
        const line = linesById.get(row.id)!;
        const variant = variantsById.get(row.productVariantId)!;
        const orderItemId = this.id('orditm');
        await tx.order_OrderItem.create({
          data: {
            id: orderItemId, orderId, productId: variant.productId, description: variant.name || variant.sku,
            quantity: line.quantity, price: line.unitPrice, weight: Number(variant.weight || 0), currency: 'TZS'
          }
        });
        await tx.inventory_StockOutAllocation.create({
          data: { id: this.id('invsoa'), pendingStockOutId: row.id, orderId, orderItemId, quantity: line.quantity }
        });
        const remaining = row.remainingQuantity - line.quantity;
        await tx.inventory_PendingStockOut.update({
          where: { id: row.id },
          data: { status: remaining === 0 ? 'RECONCILED' : 'PARTIALLY_RECONCILED' }
        });
      }

      await tx.order_Payment.create({
        data: {
          id: this.id('ordpay'), orderId, amount: totalAmount, currency: 'TZS', method: input.paymentMethod,
          status: 'COMPLETED', transactionId: input.paymentReference || null,
          metadata: { source: 'pending_stock_out_reconciliation', notes: input.notes || null, actorId: actor.userId }
        }
      });
      await tx.inventory_ReconciliationRequest.update({
        where: { sellerId_idempotencyKey: { sellerId, idempotencyKey: input.idempotencyKey } },
        data: { orderId }
      });

      return { ...order, items: await tx.order_OrderItem.findMany({ where: { orderId } }) };
    });
  }

  private async getWarehouse(tx: any, warehouseId: string): Promise<any> {
    const warehouse = await tx.inventory_Warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse?.sellerId || !warehouse.sellerLocationId) throw new Error('Warehouse is not a seller location');
    return warehouse;
  }

  private async findRequest(tx: any, sellerId: string, idempotencyKey: string): Promise<any> {
    return tx.inventory_ReconciliationRequest.findUnique({ where: { sellerId_idempotencyKey: { sellerId, idempotencyKey } } });
  }

  private assertActorCanManageWarehouse(actor: Actor, warehouse: any): void {
    if (!this.isAdmin(actor) && actor.userId !== warehouse.sellerId) throw new Error('You cannot manage stock for this seller location');
  }

  private isAdmin(actor: Actor): boolean {
    return actor.roles.some((role) => role.toLowerCase() === 'admin');
  }

  private assertValidStockOut(input: CreateStockOutInput): void {
    if (!input.warehouseId || !input.productVariantId || !input.reason?.trim() || !input.idempotencyKey) throw new Error('warehouseId, productVariantId, reason, and Idempotency-Key are required');
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error('quantity must be a positive integer');
    if (input.occurredAt && Number.isNaN(new Date(input.occurredAt).getTime())) throw new Error('occurredAt must be an ISO timestamp');
  }

  private assertValidReconciliation(input: ReconcileStockOutInput): void {
    if (!input.buyerId || !input.idempotencyKey || !Array.isArray(input.lines) || input.lines.length === 0) throw new Error('buyerId, lines, and Idempotency-Key are required');
    if (!['DIRECT_PAYMENT', 'MOBILE_MONEY', 'CARD', 'WALLET'].includes(input.paymentMethod)) throw new Error('Unsupported payment method');
    const ids = new Set<string>();
    for (const line of input.lines) {
      if (!line.pendingStockOutId || ids.has(line.pendingStockOutId) || !Number.isInteger(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
        throw new Error('Each reconciliation line must have a unique stock-out id, positive integer quantity, and non-negative unit price');
      }
      ids.add(line.pendingStockOutId);
    }
  }

  private id(prefix: string): string {
    return `${prefix}_${randomUUID()}`;
  }
}
