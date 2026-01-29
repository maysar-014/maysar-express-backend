import { OrderFulfillmentSaga } from '../../sagas/order-fulfillment.saga';
import { CheckoutEventHandlers } from '../../handlers/checkout-event.handlers';

describe('OrderFulfillmentSaga Tests', () => {
  let saga: OrderFulfillmentSaga;
  let mockEventBus: any;
  let mockCheckoutRepository: any;
  let mockCartRepository: any;

  beforeEach(() => {
    mockEventBus = { publish: jest.fn() };
    mockCheckoutRepository = { getSession: jest.fn() };
    mockCartRepository = { delete: jest.fn() };

    saga = new OrderFulfillmentSaga(
      mockEventBus,
      mockCheckoutRepository,
      mockCartRepository
    );
  });

  describe('Happy Path', () => {
    it('should complete full order fulfillment', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        cartId: 'cart-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        totalAmount: 100,
        paymentMethodId: 'pm-1'
      });

      await saga.execute('session-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'InventoryReservationRequested',
        expect.any(Object)
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'PaymentProcessingRequested',
        expect.any(Object)
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'OrderCreationRequested',
        expect.any(Object)
      );
    });

    it('should clear cart after fulfillment', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        cartId: 'cart-1',
        items: [],
        totalAmount: 100
      });

      await saga.execute('session-1');

      expect(mockCartRepository.delete).toHaveBeenCalledWith('cart-1');
    });

    it('should publish events in correct order', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        cartId: 'cart-1',
        items: [],
        totalAmount: 100
      });

      await saga.execute('session-1');

      const calls = mockEventBus.publish.mock.calls;
      expect(calls[0][0]).toBe('InventoryReservationRequested');
      expect(calls[1][0]).toBe('PaymentProcessingRequested');
      expect(calls[2][0]).toBe('OrderCreationRequested');
    });
  });

  describe('Compensation Scenarios', () => {
    it('should compensate on error', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        cartId: 'cart-1',
        items: []
      });
      mockCartRepository.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(saga.execute('session-1')).rejects.toThrow();

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'InventoryReleaseRequested',
        expect.any(Object)
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'PaymentRefundRequested',
        expect.any(Object)
      );
    });

    it('should include checkout id in compensation events', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        cartId: 'cart-1',
        items: []
      });
      mockCartRepository.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(saga.execute('session-1')).rejects.toThrow();

      const compensationCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0].includes('Release') || call[0].includes('Refund')
      );

      compensationCalls.forEach(call => {
        expect(call[1].checkoutId).toBe('session-1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent session', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue(null);

      await expect(saga.execute('session-999')).rejects.toThrow('Session not found');
    });

    it('should handle repository errors', async () => {
      mockCheckoutRepository.getSession.mockRejectedValue(
        new Error('Database error')
      );

      await expect(saga.execute('session-1')).rejects.toThrow('Database error');
    });
  });
});

describe('CheckoutEventHandlers Tests', () => {
  let handlers: CheckoutEventHandlers;
  let mockEventBus: any;
  let mockCheckoutRepository: any;

  beforeEach(() => {
    mockEventBus = { subscribe: jest.fn() };
    mockCheckoutRepository = { getSession: jest.fn(), saveSession: jest.fn() };

    handlers = new CheckoutEventHandlers(mockEventBus, mockCheckoutRepository);
  });

  describe('Event Registration', () => {
    it('should register all event handlers', () => {
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'InventoryReserved',
        expect.any(Function)
      );
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'InventoryReservationFailed',
        expect.any(Function)
      );
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'PaymentProcessed',
        expect.any(Function)
      );
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'PaymentFailed',
        expect.any(Function)
      );
    });
  });

  describe('Inventory Reserved Handler', () => {
    it('should update session status on inventory reserved', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        status: 'initiated'
      });

      const handler = mockEventBus.subscribe.mock.calls[0][1];
      await handler({ checkoutId: 'session-1' });

      expect(mockCheckoutRepository.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inventory_reserved' })
      );
    });

    it('should handle missing session', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue(null);

      const handler = mockEventBus.subscribe.mock.calls[0][1];
      await handler({ checkoutId: 'session-999' });

      expect(mockCheckoutRepository.saveSession).not.toHaveBeenCalled();
    });
  });

  describe('Inventory Reservation Failed Handler', () => {
    it('should mark session as failed', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        status: 'initiated'
      });

      const handler = mockEventBus.subscribe.mock.calls[1][1];
      await handler({ checkoutId: 'session-1' });

      expect(mockCheckoutRepository.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  describe('Payment Processed Handler', () => {
    it('should update session on payment success', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        status: 'inventory_reserved'
      });

      const handler = mockEventBus.subscribe.mock.calls[2][1];
      await handler({ checkoutId: 'session-1' });

      expect(mockCheckoutRepository.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'payment_completed',
          paymentStatus: 'completed'
        })
      );
    });
  });

  describe('Payment Failed Handler', () => {
    it('should mark session as failed and publish compensation', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        status: 'payment_pending'
      });

      const handler = mockEventBus.subscribe.mock.calls[3][1];
      await handler({ checkoutId: 'session-1' });

      expect(mockCheckoutRepository.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should publish inventory release on payment failure', async () => {
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        status: 'payment_pending'
      });

      const handler = mockEventBus.subscribe.mock.calls[3][1];
      await handler({ checkoutId: 'session-1' });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'InventoryReleaseRequested',
        expect.any(Object)
      );
    });
  });
});
