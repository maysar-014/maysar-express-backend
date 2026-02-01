import { eventBus } from '../../shared/events/eventBus';
import { StockManager } from '../stock/stockManager';
import { ReservationEngine } from '../reservation/reservationEngine';

// Order events from shared contracts
interface OrderCreatedEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'OrderCreated';
  producer: string;
  timestamp: string;
  payload: {
    orderId: string;
    userId: string;
    items: Array<{
      id: string;
      variantId: string;
      quantity: number;
      price: number;
    }>;
    shippingAddress?: {
      latitude: number;
      longitude: number;
      country: string;
      city: string;
    };
  };
}

interface OrderCancelledEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'OrderCancelled';
  producer: string;
  timestamp: string;
  payload: {
    orderId: string;
    reason: string;
    cancelledAt: string;
  };
}

interface ShipmentDeliveredEvent {
  eventId: string;
  eventVersion: number;
  eventType: 'ShipmentDelivered';
  producer: string;
  timestamp: string;
  payload: {
    orderId: string;
    shipmentId: string;
    deliveredAt: string;
    items: Array<{
      variantId: string;
      warehouseId: string;
      quantity: number;
    }>;
  };
}

export class InventoryEventHandlers {
  constructor(
    private stockManager: StockManager,
    private reservationEngine: ReservationEngine
  ) {
    this.registerEventHandlers();
  }

  /**
   * Register all event handlers with the event bus
   */
  private registerEventHandlers(): void {
    // Register event handlers
    eventBus.on('OrderCreated.v1', this.handleOrderCreated.bind(this));
    eventBus.on('OrderCancelled.v1', this.handleOrderCancelled.bind(this));
    eventBus.on('ShipmentDelivered.v1', this.handleShipmentDelivered.bind(this));

    // Saga Handlers
    eventBus.on('StockReservation.Command.v1', this.handleStockReservationCommand.bind(this));
    eventBus.on('StockRelease.Command.v1', this.handleStockReleaseCommand.bind(this));
  }

  /**
   * Handle stock reservation command for Saga
   */
  async handleStockReservationCommand(event: any): Promise<void> {
    const { sagaId, orderId, items, shippingAddress } = event.payload || event.data;
    console.log(`[Saga] Processing StockReservation command for saga ${sagaId}, order ${orderId}`);

    try {
      const result = await this.reservationEngine.reserveStock({
        orderId,
        items: items.map((i: any) => ({
          id: i.productId, // Map productId to id for reservation engine
          variantId: i.productId,
          quantity: i.quantity,
          price: 0 // Price not strictly needed for reservation logic here
        })),
        shippingAddress
      });

      if (result.success) {
        await eventBus.emit('StockReservation.Success.v1', {
          sagaId,
          orderId,
          reservations: result.reservations,
          timestamp: new Date().toISOString()
        });
      } else {
        await eventBus.emit('StockReservation.Failure.v1', {
          sagaId,
          orderId,
          reason: result.error || 'Insufficient stock',
          unavailableItems: result.unavailableItems,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error(`[Saga] Error in StockReservation handler:`, error);
      await eventBus.emit('StockReservation.Failure.v1', {
        sagaId,
        orderId,
        reason: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle stock release command for Saga compensation
   */
  async handleStockReleaseCommand(event: any): Promise<void> {
    const { sagaId, orderId } = event.payload || event.data;
    console.log(`[Saga] Processing StockRelease command (compensation) for saga ${sagaId}, order ${orderId}`);

    try {
      await this.reservationEngine.cancelReservations(orderId);
      await eventBus.emit('StockRelease.Success.v1', {
        sagaId,
        orderId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(`[Saga] Error in StockRelease handler:`, error);
      await eventBus.emit('StockRelease.Failure.v1', {
        sagaId,
        orderId,
        reason: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle order creation - reserve stock immediately
   */
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.log(`Processing OrderCreated event for order ${event.payload.orderId}`);

    try {
      const result = await this.reservationEngine.reserveStock({
        orderId: event.payload.orderId,
        items: event.payload.items.map(item => ({
          id: item.id,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price
        })),
        shippingAddress: event.payload.shippingAddress
      });

      if (!result.success) {
        console.error(`Stock reservation failed for order ${event.payload.orderId}:`, result.error);
        // In a real implementation, you might want to emit a ReservationFailed event
        // or trigger order cancellation
      } else {
        console.log(`Stock reserved for order ${event.payload.orderId}:`, result.reservations);
      }
    } catch (error) {
      console.error(`Error processing OrderCreated for ${event.payload.orderId}:`, error);
      // Consider implementing retry logic or dead letter queue
    }
  }

  /**
   * Handle order cancellation - release reserved stock
   */
  async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    console.log(`Processing OrderCancelled event for order ${event.payload.orderId}`);

    try {
      await this.reservationEngine.cancelReservations(event.payload.orderId);
      console.log(`Reservations cancelled for order ${event.payload.orderId}`);
    } catch (error) {
      console.error(`Error cancelling reservations for ${event.payload.orderId}:`, error);
    }
  }

  /**
   * Handle shipment delivery - actually reduce stock
   */
  async handleShipmentDelivered(event: ShipmentDeliveredEvent): Promise<void> {
    console.log(`Processing ShipmentDelivered event for order ${event.payload.orderId}`);

    try {
      // First, fulfill the reservations (mark as completed)
      await this.reservationEngine.fulfillReservations(event.payload.orderId);

      // Then, reduce actual stock levels
      await this.stockManager.reduceStock(event.payload.orderId, event.payload.items);

      console.log(`Stock fulfilled for order ${event.payload.orderId}`);
    } catch (error) {
      console.error(`Error processing shipment delivery for ${event.payload.orderId}:`, error);
    }
  }

  /**
   * Handle expired reservations cleanup
   */
  async cleanupExpiredReservations(): Promise<void> {
    console.log('Running expired reservations cleanup');

    try {
      const cleanedCount = await this.reservationEngine.releaseExpiredReservations();
      console.log(`Cleaned up ${cleanedCount} expired reservations`);
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
    }
  }

  /**
   * Handle inventory count completion
   */
  async handleInventoryCountCompletion(countId: string): Promise<void> {
    // This would be triggered internally after inventory count completion
    console.log(`Processing inventory count completion for ${countId}`);

    // Could trigger reconciliation processes, alerts, etc.
    // For now, just log completion
  }

  /**
   * Handle low stock alerts
   */
  async handleLowStockAlert(variantId: string, warehouseId: string, currentStock: number): Promise<void> {
    console.log(`Processing low stock alert for ${variantId} in warehouse ${warehouseId}: ${currentStock} remaining`);

    // Could trigger:
    // - Auto-reorder processes
    // - Supplier notifications
    // - Management alerts
    // - Alternative sourcing checks
  }
}
