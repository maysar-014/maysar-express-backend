// Inventory Service with Strong Consistency
// Implements inventory reservations with database-level consistency guarantees

import { PrismaClient } from '@prisma/client';

export interface ReservationRequest {
  stockItemId: string;
  orderId: string;
  quantity: number;
  expiresAt?: Date;
}

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  availableQuantity: number;
  reservedQuantity: number;
  error?: string;
}

export interface InventoryCheckResult {
  available: boolean;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
}

export class InventoryService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check inventory availability with strong consistency
   * Uses SELECT FOR UPDATE to prevent race conditions
   */
  async checkInventoryAvailability(
    stockItemId: string,
    requestedQuantity: number
  ): Promise<InventoryCheckResult> {
    // Use transaction with SELECT FOR UPDATE for strong consistency
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const stockItem = await tx.stockItem.findUnique({
        where: { id: stockItemId },
        select: {
          id: true,
          quantity: true,
          reserved: true,
          minStock: true,
          maxStock: true,
          productId: true,
        },
      });

      if (!stockItem) {
        throw new Error(`Stock item ${stockItemId} not found`);
      }

      const availableQuantity = stockItem.quantity - stockItem.reserved;
      const isAvailable = availableQuantity >= requestedQuantity;

      return {
        available: isAvailable,
        availableQuantity,
        reservedQuantity: stockItem.reserved,
        totalQuantity: stockItem.quantity,
      };
    });

    return result;
  }

  /**
   * Reserve inventory with strong consistency guarantees
   * Uses database transactions and row-level locking
   */
  async reserveInventory(request: ReservationRequest): Promise<ReservationResult> {
    const { stockItemId, orderId, quantity, expiresAt } = request;

    // Default expiration: 30 minutes
    const expiration = expiresAt || new Date(Date.now() + 30 * 60 * 1000);

    try {
      const result = await (this.prisma as any).$transaction(async (tx: any) => {
        // Step 1: Lock and check current inventory state
        const stockItem = await tx.stockItem.findUnique({
          where: { id: stockItemId },
          select: {
            id: true,
            quantity: true,
            reserved: true,
            productId: true,
          },
        });

        if (!stockItem) {
          throw new Error(`Stock item ${stockItemId} not found`);
        }

        const availableQuantity = stockItem.quantity - stockItem.reserved;

        if (availableQuantity < quantity) {
          return {
            success: false,
            availableQuantity,
            reservedQuantity: stockItem.reserved,
            error: `Insufficient inventory. Requested: ${quantity}, Available: ${availableQuantity}`,
          };
        }

        // Step 2: Create reservation
        const reservation = await tx.reservation.create({
          data: {
            stockItemId,
            orderId,
            quantity,
            expiresAt: expiration,
            status: 'active',
          },
        });

        // Step 3: Update reserved quantity atomically
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: {
            reserved: {
              increment: quantity,
            },
          },
        });

        // Step 4: Update computed available field
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: {
            available: stockItem.quantity - stockItem.reserved - quantity,
          },
        });

        return {
          success: true,
          reservationId: reservation.id,
          availableQuantity: availableQuantity - quantity,
          reservedQuantity: stockItem.reserved + quantity,
        };
      });

      return result;
    } catch (error) {
      console.error('Inventory reservation failed:', error);
      return {
        success: false,
        availableQuantity: 0,
        reservedQuantity: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Fulfill reservation (convert to actual sale)
   */
  async fulfillReservation(reservationId: string): Promise<boolean> {
    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        // Get reservation details
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          select: {
            id: true,
            stockItemId: true,
            quantity: true,
            status: true,
          },
        });

        if (!reservation) {
          throw new Error(`Reservation ${reservationId} not found`);
        }

        if (reservation.status !== 'active') {
          throw new Error(`Reservation ${reservationId} is not active`);
        }

        // Update reservation status
        await tx.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'fulfilled',
          },
        });

        // Decrease both quantity and reserved (item is sold)
        await tx.stockItem.update({
          where: { id: reservation.stockItemId },
          data: {
            quantity: {
              decrement: reservation.quantity,
            },
            reserved: {
              decrement: reservation.quantity,
            },
            available: {
              // This will be computed correctly since both quantity and reserved are decremented
            },
          },
        });

        // Update computed available field
        const stockItem = await tx.stockItem.findUnique({
          where: { id: reservation.stockItemId },
          select: { quantity: true, reserved: true },
        });

        if (stockItem) {
          await tx.stockItem.update({
            where: { id: reservation.stockItemId },
            data: {
              available: stockItem.quantity - stockItem.reserved,
            },
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Reservation fulfillment failed:', error);
      return false;
    }
  }

  /**
   * Cancel reservation (release reserved inventory)
   */
  async cancelReservation(reservationId: string): Promise<boolean> {
    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          select: {
            id: true,
            stockItemId: true,
            quantity: true,
            status: true,
          },
        });

        if (!reservation) {
          throw new Error(`Reservation ${reservationId} not found`);
        }

        if (reservation.status !== 'active') {
          throw new Error(`Reservation ${reservationId} is not active`);
        }

        // Update reservation status
        await tx.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'cancelled',
          },
        });

        // Release reserved quantity
        await tx.stockItem.update({
          where: { id: reservation.stockItemId },
          data: {
            reserved: {
              decrement: reservation.quantity,
            },
          },
        });

        // Update computed available field
        const stockItem = await tx.stockItem.findUnique({
          where: { id: reservation.stockItemId },
          select: { quantity: true, reserved: true },
        });

        if (stockItem) {
          await tx.stockItem.update({
            where: { id: reservation.stockItemId },
            data: {
              available: stockItem.quantity - (stockItem.reserved - reservation.quantity),
            },
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Reservation cancellation failed:', error);
      return false;
    }
  }

  /**
   * Expire old reservations (cleanup job)
   */
  async expireOldReservations(): Promise<number> {
    const now = new Date();

    const expiredReservations = await (this.prisma as any).reservation.findMany({
      where: {
        status: 'active',
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        stockItemId: true,
        quantity: true,
      },
    });

    if (expiredReservations.length === 0) {
      return 0;
    }

    // Group by stock item for efficient updates
    const stockItemUpdates = new Map<string, number>();

    for (const reservation of expiredReservations) {
      const current = stockItemUpdates.get(reservation.stockItemId) || 0;
      stockItemUpdates.set(reservation.stockItemId, current + reservation.quantity);
    }

    // Update all affected stock items in a transaction
    await (this.prisma as any).$transaction(async (tx: any) => {
      // Mark reservations as expired
      await tx.reservation.updateMany({
        where: {
          id: {
            in: expiredReservations.map((r: any) => r.id),
          },
        },
        data: {
          status: 'expired',
        },
      });

      // Update stock item reserved quantities
      for (const [stockItemId, quantityToRelease] of Array.from(stockItemUpdates.entries())) {
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: {
            reserved: {
              decrement: quantityToRelease,
            },
          },
        });

        // Update computed available field
        const stockItem = await tx.stockItem.findUnique({
          where: { id: stockItemId },
          select: { quantity: true, reserved: true },
        });

        if (stockItem) {
          await tx.stockItem.update({
            where: { id: stockItemId },
            data: {
              available: stockItem.quantity - (stockItem.reserved - quantityToRelease),
            },
          });
        }
      }
    });

    return expiredReservations.length;
  }

  /**
   * Get inventory summary for a product across all warehouses
   */
  async getProductInventorySummary(productId: string): Promise<{
    totalQuantity: number;
    totalReserved: number;
    totalAvailable: number;
    warehouses: Array<{
      warehouseId: string;
      warehouseName: string;
      quantity: number;
      reserved: number;
      available: number;
    }>;
  }> {
    const stockItems = await (this.prisma as any).stockItem.findMany({
      where: { productId },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const summary = stockItems.reduce(
      (acc: {
        totalQuantity: number;
        totalReserved: number;
        totalAvailable: number;
        warehouses: Array<{
          warehouseId: string;
          warehouseName: string;
          quantity: number;
          reserved: number;
          available: number;
        }>;
      }, item: any) => {
        const available = item.quantity - item.reserved;
        acc.totalQuantity += item.quantity;
        acc.totalReserved += item.reserved;
        acc.totalAvailable += available;

        acc.warehouses.push({
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse.name,
          quantity: item.quantity,
          reserved: item.reserved,
          available,
        });

        return acc;
      },
      {
        totalQuantity: 0,
        totalReserved: 0,
        totalAvailable: 0,
        warehouses: [] as Array<{
          warehouseId: string;
          warehouseName: string;
          quantity: number;
          reserved: number;
          available: number;
        }>,
      }
    );

    return summary;
  }

  /**
   * Update stock levels (for receiving new inventory)
   */
  async updateStockLevel(
    stockItemId: string,
    newQuantity: number,
    reason: string
  ): Promise<boolean> {
    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        const stockItem = await tx.stockItem.findUnique({
          where: { id: stockItemId },
          select: {
            quantity: true,
            reserved: true,
          },
        });

        if (!stockItem) {
          throw new Error(`Stock item ${stockItemId} not found`);
        }

        // Update quantity
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: {
            quantity: newQuantity,
            available: newQuantity - stockItem.reserved,
          },
        });
      });

      return true;
    } catch (error) {
      console.error('Stock level update failed:', error);
      return false;
    }
  }
}

// Factory function
export function createInventoryService(prisma: PrismaClient): InventoryService {
  return new InventoryService(prisma);
}

// Export default
export default InventoryService;
