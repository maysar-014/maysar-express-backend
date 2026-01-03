import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { EventEnvelope, InventoryReservedPayload, InventoryReleasedPayload, EventFactory } from '../../../events';
import { randomUUID } from 'crypto';

export class InventoryService {
  private outbox: TransactionalOutbox;

  constructor(private prisma: PrismaClient) {
    this.outbox = new TransactionalOutbox(prisma);
  }

  async reserveInventory(reservationData: {
    orderId: string;
    items: Array<{
      productVariantId: string;
      quantity: number;
      warehouseId: string;
    }>;
  }): Promise<{ success: boolean; reservationIds: string[] }> {
    return await this.prisma.$transaction(async (tx) => {
      const reservationIds: string[] = [];
      const reservations: Array<{
        productVariantId: string;
        warehouseId: string;
        quantity: number;
        reservationId: string;
      }> = [];

      // Check availability and create reservations
      for (const item of reservationData.items) {
        const stock = await tx.inventory.findFirst({
          where: {
            productVariantId: item.productVariantId,
            warehouseId: item.warehouseId
          }
        });

        if (!stock || stock.availableQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productVariantId}`);
        }

        const reservationId = randomUUID();
        
        // Create reservation
        await tx.inventoryReservation.create({
          data: {
            id: reservationId,
            orderId: reservationData.orderId,
            productVariantId: item.productVariantId,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
            status: 'active',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          }
        });

        // Update available quantity
        await tx.inventory.update({
          where: { id: stock.id },
          data: {
            availableQuantity: { decrement: item.quantity },
            reservedQuantity: { increment: item.quantity }
          }
        });

        reservationIds.push(reservationId);
        reservations.push({
          productVariantId: item.productVariantId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          reservationId
        });
      }

      // Create inventory reserved event
      const eventPayload = EventFactory.createInventoryReserved({
        orderId: reservationData.orderId,
        reservations
      });

      const envelope: EventEnvelope<InventoryReservedPayload> = {
        eventId: randomUUID(),
        eventType: 'inventory.reserved.v1',
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'inventory-service',
        version: 'v1',
        payload: eventPayload
      };

      await this.outbox.saveEvent(envelope, tx);

      return { success: true, reservationIds };
    });
  }

  async releaseInventory(orderId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId, status: 'active' }
      });

      const reservationIds: string[] = [];

      for (const reservation of reservations) {
        // Update reservation status
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: { status: 'released' }
        });

        // Restore inventory
        await tx.inventory.updateMany({
          where: {
            productVariantId: reservation.productVariantId,
            warehouseId: reservation.warehouseId
          },
          data: {
            availableQuantity: { increment: reservation.quantity },
            reservedQuantity: { decrement: reservation.quantity }
          }
        });

        reservationIds.push(reservation.id);
      }

      // Create inventory released event
      const eventPayload: InventoryReleasedPayload = {
        version: 'v1',
        orderId,
        reservationIds,
        reason: reason as 'order_cancelled' | 'payment_failed' | 'expired'
      };

      const envelope: EventEnvelope<InventoryReleasedPayload> = {
        eventId: randomUUID(),
        eventType: 'inventory.released.v1',
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'inventory-service',
        version: 'v1',
        payload: eventPayload
      };

      await this.outbox.saveEvent(envelope, tx);
    });
  }
}