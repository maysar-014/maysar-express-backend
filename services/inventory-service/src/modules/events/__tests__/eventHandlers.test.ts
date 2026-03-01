import { InventoryEventHandlers } from '../eventHandlers';
import { StockManager } from '../../stock/stockManager';
import { ReservationEngine } from '../../reservation/reservationEngine';
import { eventBus } from '@shared-events/eventBus';
import { EventIdempotency } from '@shared/middleware/idempotency';

jest.mock('../../stock/stockManager');
jest.mock('../../reservation/reservationEngine');
jest.mock('@shared-events/eventBus');

const mockEventIdempotency = {
  isProcessed: jest.fn().mockResolvedValue(false),
  markProcessed: jest.fn().mockResolvedValue(undefined),
  withIdempotency: jest.fn().mockImplementation(
    (_eventId: string, _consumer: string, handler: () => Promise<any>) => handler()
  ),
} as unknown as EventIdempotency;

describe('InventoryEventHandlers', () => {
  let handlers: InventoryEventHandlers;
  let mockStockManager: jest.Mocked<StockManager>;
  let mockReservationEngine: jest.Mocked<ReservationEngine>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStockManager = { reduceStock: jest.fn() } as any;
    mockReservationEngine = {
      reserveStock: jest.fn(),
      cancelReservations: jest.fn(),
      fulfillReservations: jest.fn(),
      releaseExpiredReservations: jest.fn()
    } as any;
    (eventBus.on as jest.Mock) = jest.fn();
    (eventBus.publish as jest.Mock) = jest.fn();
    handlers = new InventoryEventHandlers(mockStockManager, mockReservationEngine, mockEventIdempotency);
  });

  describe('handleOrderCreated', () => {
    it('should reserve stock for new order', async () => {
      const event = {
        eventId: 'evt-1',
        eventVersion: 1,
        eventType: 'OrderCreated' as const,
        producer: 'order-service',
        timestamp: new Date().toISOString(),
        payload: {
          orderId: 'order-1',
          userId: 'user-1',
          items: [{ id: 'item-1', variantId: 'var-1', quantity: 5, price: 100 }]
        }
      };

      mockReservationEngine.reserveStock.mockResolvedValue({ success: true, reservations: [] });

      await handlers.handleOrderCreated(event);

      expect(mockReservationEngine.reserveStock).toHaveBeenCalledWith({
        orderId: 'order-1',
        items: expect.any(Array),
        shippingAddress: undefined
      });
    });

    it('should handle reservation failure', async () => {
      const event = {
        eventId: 'evt-1',
        eventVersion: 1,
        eventType: 'OrderCreated' as const,
        producer: 'order-service',
        timestamp: new Date().toISOString(),
        payload: {
          orderId: 'order-1',
          userId: 'user-1',
          items: [{ id: 'item-1', variantId: 'var-1', quantity: 5, price: 100 }]
        }
      };

      mockReservationEngine.reserveStock.mockResolvedValue({
        success: false,
        error: 'Insufficient stock'
      });

      await handlers.handleOrderCreated(event);

      expect(mockReservationEngine.reserveStock).toHaveBeenCalled();
    });
  });

  describe('handleOrderCancelled', () => {
    it('should release reservations', async () => {
      const event = {
        eventId: 'evt-1',
        eventVersion: 1,
        eventType: 'OrderCancelled' as const,
        producer: 'order-service',
        timestamp: new Date().toISOString(),
        payload: {
          orderId: 'order-1',
          reason: 'Customer request',
          cancelledAt: new Date().toISOString()
        }
      };

      await handlers.handleOrderCancelled(event);

      expect(mockReservationEngine.cancelReservations).toHaveBeenCalledWith('order-1');
    });
  });

  describe('handleShipmentDelivered', () => {
    it('should fulfill reservations and reduce stock', async () => {
      const event = {
        eventId: 'evt-1',
        eventVersion: 1,
        eventType: 'ShipmentDelivered' as const,
        producer: 'logistics-service',
        timestamp: new Date().toISOString(),
        payload: {
          orderId: 'order-1',
          shipmentId: 'ship-1',
          deliveredAt: new Date().toISOString(),
          items: [{ variantId: 'var-1', warehouseId: 'wh-1', quantity: 5 }]
        }
      };

      await handlers.handleShipmentDelivered(event);

      expect(mockReservationEngine.fulfillReservations).toHaveBeenCalledWith('order-1');
      expect(mockStockManager.reduceStock).toHaveBeenCalledWith('order-1', event.payload.items);
    });
  });

  describe('handleStockReservationCommand', () => {
    it('should emit success event on successful reservation', async () => {
      const event = {
        payload: {
          sagaId: 'saga-1',
          orderId: 'order-1',
          items: [{ productId: 'var-1', quantity: 5 }],
          shippingAddress: null
        }
      };

      mockReservationEngine.reserveStock.mockResolvedValue({
        success: true,
        reservations: []
      });

      await handlers.handleStockReservationCommand(event);

      expect(eventBus.publish).toHaveBeenCalledWith('StockReservation.Success.v1', expect.any(Object));
    });

    it('should emit failure event on reservation failure', async () => {
      const event = {
        payload: {
          sagaId: 'saga-1',
          orderId: 'order-1',
          items: [{ productId: 'var-1', quantity: 5 }],
          shippingAddress: null
        }
      };

      mockReservationEngine.reserveStock.mockResolvedValue({
        success: false,
        error: 'Insufficient stock',
        unavailableItems: []
      });

      await handlers.handleStockReservationCommand(event);

      expect(eventBus.publish).toHaveBeenCalledWith('StockReservation.Failure.v1', expect.any(Object));
    });
  });

  describe('handleStockReleaseCommand', () => {
    it('should emit success event on successful release', async () => {
      const event = {
        payload: {
          sagaId: 'saga-1',
          orderId: 'order-1'
        }
      };

      await handlers.handleStockReleaseCommand(event);

      expect(mockReservationEngine.cancelReservations).toHaveBeenCalledWith('order-1');
      expect(eventBus.publish).toHaveBeenCalledWith('StockRelease.Success.v1', expect.any(Object));
    });
  });

  describe('idempotency', () => {
    it('should skip handler when event already processed', async () => {
      (mockEventIdempotency.withIdempotency as jest.Mock).mockResolvedValueOnce(null);

      const event = {
        eventId: 'evt-dup',
        eventVersion: 1,
        eventType: 'OrderCreated' as const,
        producer: 'order-service',
        timestamp: new Date().toISOString(),
        payload: {
          orderId: 'order-1',
          userId: 'user-1',
          items: [{ id: 'item-1', variantId: 'var-1', quantity: 5, price: 100 }]
        }
      };

      await handlers.handleOrderCreated(event);

      expect(mockReservationEngine.reserveStock).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredReservations', () => {
    it('should cleanup expired reservations', async () => {
      mockReservationEngine.releaseExpiredReservations.mockResolvedValue(5);

      await handlers.cleanupExpiredReservations();

      expect(mockReservationEngine.releaseExpiredReservations).toHaveBeenCalled();
    });
  });
});
