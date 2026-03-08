import { EventBus } from '@shared-events/eventBus';
import { LowStockAlertEvent, InventoryUpdatedEvent } from '../events/inventoryEvents';

export interface StockItemRecord {
  id?: string;
  productVariantId: string;
  warehouseId: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderPoint?: number | null;
  maxStock?: number | null;
  unitCost?: number | null;
  updatedAt: Date;
}

export interface ReservationRecord {
  id: string;
  orderId: string;
  productVariantId: string;
  warehouseId: string;
  quantityReserved: number;
  status: string;
}

type StockItemWhereUnique = {
  productVariantId_warehouseId: {
    productVariantId: string;
    warehouseId: string;
  };
};

interface StockItemDelegate {
  findMany(args: {
    where: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<StockItemRecord[]>;
  findUnique(args: { where: StockItemWhereUnique }): Promise<StockItemRecord | null>;
  update(args: { where: StockItemWhereUnique; data: Record<string, unknown> }): Promise<StockItemRecord>;
}

interface InventoryMovementDelegate {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
}

interface ReservationDelegate {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  findMany(args: { where: Record<string, unknown> }): Promise<ReservationRecord[]>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
}

export interface StockManagerTxClient {
  stockItem: StockItemDelegate;
  inventoryMovement: InventoryMovementDelegate;
  reservation: ReservationDelegate;
}

export interface StockManagerPrisma extends StockManagerTxClient {
  $transaction<T>(callback: (tx: StockManagerTxClient) => Promise<T>): Promise<T>;
}

export interface StockLevel {
  variantId: string;
  warehouseId: string;
  available: number;
  reserved: number;
  total: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: Date;
}

export interface StockUpdate {
  variantId: string;
  warehouseId: string;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason: string;
  referenceId?: string;
  referenceType?: string;
  performedBy?: string;
}

export class StockManager {
  constructor(
    private prisma: StockManagerPrisma,
    private eventBus: EventBus
  ) {}

  /**
   * Get real-time stock level for a product variant
   */
  async getStockLevel(variantId: string, warehouseId?: string): Promise<StockLevel[]> {
    const whereClause = warehouseId
      ? { productVariantId: variantId, warehouseId }
      : { productVariantId: variantId };

    const stockItems = await this.prisma.stockItem.findMany({
      where: whereClause,
      include: { warehouse: true },
      orderBy: { updatedAt: 'desc' }
    });

    return stockItems.map((item: StockItemRecord) => ({
      variantId: item.productVariantId,
      warehouseId: item.warehouseId,
      available: item.quantityAvailable,
      reserved: item.quantityReserved,
      total: item.quantityAvailable + item.quantityReserved,
      status: this.calculateStockStatus(item),
      lastUpdated: item.updatedAt
    }));
  }

  /**
   * Update stock levels with full audit trail
   */
  async updateStock(updates: StockUpdate[]): Promise<void> {
    const operations = updates.map(async (update) => {
      return await this.prisma.$transaction(async (tx: StockManagerTxClient) => {
        // Get current stock item
        const stockItem = await tx.stockItem.findUnique({
          where: {
            productVariantId_warehouseId: {
              productVariantId: update.variantId,
              warehouseId: update.warehouseId
            }
          }
        });

        if (!stockItem) {
          throw new Error(`Stock item not found: ${update.variantId} in warehouse ${update.warehouseId}`);
        }

        // Calculate new quantity
        let newQuantity: number;
        switch (update.operation) {
          case 'add':
            newQuantity = stockItem.quantityAvailable + update.quantity;
            break;
          case 'subtract':
            newQuantity = Math.max(0, stockItem.quantityAvailable - update.quantity);
            break;
          case 'set':
            newQuantity = Math.max(0, update.quantity);
            break;
          default:
            throw new Error(`Invalid operation: ${update.operation}`);
        }

        // Validate business rules
        await this.validateStockUpdate(stockItem, newQuantity, update);

        // Update stock item
        const updatedStock = await tx.stockItem.update({
          where: {
            productVariantId_warehouseId: {
              productVariantId: update.variantId,
              warehouseId: update.warehouseId
            }
          },
          data: {
            quantityAvailable: newQuantity,
            updatedAt: new Date()
          }
        });

        // Record inventory movement
        await tx.inventoryMovement.create({
          data: {
            productVariantId: update.variantId,
            warehouseId: update.warehouseId,
            movementType: this.getMovementType(update.operation),
            quantity: update.quantity,
            referenceType: update.referenceType,
            referenceId: update.referenceId,
            reason: update.reason,
            performedBy: update.performedBy,
            unitCost: stockItem.unitCost
          }
        });

        // Check for low stock alerts
        await this.checkLowStockAlert(updatedStock);

        return updatedStock;
      });
    });

    await Promise.all(operations);

    // Emit inventory updated event
    await this.eventBus.emit('InventoryUpdated.v1', {
      updates: updates.map(u => ({
        variantId: u.variantId,
        warehouseId: u.warehouseId,
        quantity: u.quantity,
        operation: u.operation
      })),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reduce stock when orders are fulfilled
   */
  async reduceStock(orderId: string, items: Array<{
    variantId: string;
    warehouseId: string;
    quantity: number;
  }>): Promise<void> {
    const updates: StockUpdate[] = items.map(item => ({
      variantId: item.variantId,
      warehouseId: item.warehouseId,
      quantity: item.quantity,
      operation: 'subtract',
      reason: 'Order fulfillment',
      referenceId: orderId,
      referenceType: 'order'
    }));

    await this.updateStock(updates);
  }

  /**
   * Reserve stock for pending orders
   */
  async reserveStock(orderId: string, orderItemId: string, variantId: string, warehouseId: string, quantity: number): Promise<void> {
    await this.prisma.$transaction(async (tx: StockManagerTxClient) => {
      // Check available stock
      const stockItem = await tx.stockItem.findUnique({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId
          }
        }
      });

      if (!stockItem || stockItem.quantityAvailable < quantity) {
        throw new Error(`Insufficient stock for ${variantId} in warehouse ${warehouseId}`);
      }

      // Create reservation
      await tx.reservation.create({
        data: {
          orderId,
          orderItemId,
          productVariantId: variantId,
          warehouseId,
          quantityReserved: quantity,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        }
      });

      // Update reserved quantity
      await tx.stockItem.update({
        where: {
          productVariantId_warehouseId: {
            productVariantId: variantId,
            warehouseId
          }
        },
        data: {
          quantityReserved: { increment: quantity }
        }
      });
    });
  }

  /**
   * Release reserved stock (cancelled/expired orders)
   */
  async releaseStock(orderId: string, reason: 'cancelled' | 'expired' = 'cancelled'): Promise<void> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        orderId,
        status: 'active'
      }
    });

    for (const reservation of reservations) {
      await this.prisma.$transaction(async (tx: StockManagerTxClient) => {
        // Update reservation status
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: reason === 'cancelled' ? 'cancelled' : 'expired',
            updatedAt: new Date()
          }
        });

        // Release reserved stock
        await tx.stockItem.update({
          where: {
            productVariantId_warehouseId: {
              productVariantId: reservation.productVariantId,
              warehouseId: reservation.warehouseId
            }
          },
          data: {
            quantityReserved: { decrement: reservation.quantityReserved }
          }
        });
      });
    }
  }

  /**
   * Check for low stock conditions and emit alerts
   */
  private async checkLowStockAlert(stockItem: StockItemRecord): Promise<void> {
    const availableStock = stockItem.quantityAvailable;
    const reorderPoint = stockItem.reorderPoint || 0;

    if (availableStock <= reorderPoint && reorderPoint > 0) {
      const urgency = this.calculateUrgency(availableStock, reorderPoint);

      await this.eventBus.emit('LowStockAlert.v1', {
        productVariantId: stockItem.productVariantId,
        warehouseId: stockItem.warehouseId,
        currentStock: availableStock,
        reorderPoint,
        urgency,
        timestamp: new Date().toISOString()
      } as unknown as LowStockAlertEvent);
    }
  }

  /**
   * Validate stock update operations
   */
  private async validateStockUpdate(currentStock: StockItemRecord, newQuantity: number, update: StockUpdate): Promise<void> {
    // Check maximum stock limits
    if (currentStock.maxStock && newQuantity > currentStock.maxStock) {
      throw new Error(`Stock update would exceed maximum stock limit of ${currentStock.maxStock}`);
    }

    // Check for negative stock (except for adjustments)
    if (newQuantity < 0 && update.operation !== 'set') {
      throw new Error('Stock quantity cannot be negative');
    }

    // Business rule validations
    if (update.operation === 'subtract' && newQuantity < currentStock.quantityReserved) {
      throw new Error('Cannot reduce stock below reserved quantity');
    }
  }

  /**
   * Calculate stock status based on availability
   */
  private calculateStockStatus(stockItem: StockItemRecord): 'in_stock' | 'low_stock' | 'out_of_stock' {
    const available = stockItem.quantityAvailable;
    const reorderPoint = stockItem.reorderPoint || 0;

    if (available <= 0) return 'out_of_stock';
    if (available <= reorderPoint) return 'low_stock';
    return 'in_stock';
  }

  /**
   * Calculate alert urgency based on stock levels
   */
  private calculateUrgency(currentStock: number, reorderPoint: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = currentStock / reorderPoint;

    if (ratio <= 0.1) return 'critical';
    if (ratio <= 0.25) return 'high';
    if (ratio <= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Convert operation to movement type
   */
  private getMovementType(operation: string): 'inbound' | 'outbound' | 'adjustment' {
    switch (operation) {
      case 'add': return 'inbound';
      case 'subtract': return 'outbound';
      case 'set': return 'adjustment';
      default: return 'adjustment';
    }
  }
}
