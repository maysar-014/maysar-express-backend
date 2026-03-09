import { EnablerOrderFulfillmentSaga } from './enabler-order-fulfillment.saga';

describe('EnablerOrderFulfillmentSaga', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes happy path and sends notifications', async () => {
    const facilitateOrderUseCase = {
      execute: jest.fn().mockResolvedValue({
        id: 'enabler-order-1',
        orderId: 'order-1',
        orderAmount: 1500,
        enablerId: 'enabler-1'
      })
    };
    const inventoryService = {
      confirmReservation: jest.fn().mockResolvedValue(undefined),
      releaseReservation: jest.fn().mockResolvedValue(undefined)
    };
    const paymentService = {
      processPayment: jest.fn().mockResolvedValue({ success: true })
    };
    const notificationService = {
      sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
      sendNewOrderNotification: jest.fn().mockResolvedValue(undefined)
    };
    const saga = new EnablerOrderFulfillmentSaga(
      facilitateOrderUseCase as never,
      inventoryService,
      paymentService,
      notificationService
    );
    const orderData = { buyerId: 'buyer-1', listingId: 'listing-1', quantity: 2 };

    await saga.execute(orderData);

    expect(facilitateOrderUseCase.execute).toHaveBeenCalledWith(orderData);
    expect(paymentService.processPayment).toHaveBeenCalledWith({
      orderId: 'order-1',
      amount: 1500,
      payerId: 'buyer-1'
    });
    expect(inventoryService.confirmReservation).toHaveBeenCalledWith('listing-1', 2);
    expect(notificationService.sendOrderConfirmation).toHaveBeenCalledWith('buyer-1', 'order-1');
    expect(notificationService.sendNewOrderNotification).toHaveBeenCalledWith('enabler-1', 'order-1');
    expect(inventoryService.releaseReservation).not.toHaveBeenCalled();
  });

  it('compensates and rethrows when payment fails', async () => {
    const facilitateOrderUseCase = {
      execute: jest.fn().mockResolvedValue({
        id: 'enabler-order-1',
        orderId: 'order-1',
        orderAmount: 1500,
        enablerId: 'enabler-1'
      })
    };
    const inventoryService = {
      confirmReservation: jest.fn(),
      releaseReservation: jest.fn().mockResolvedValue(undefined)
    };
    const paymentService = {
      processPayment: jest.fn().mockResolvedValue({ success: false })
    };
    const notificationService = {
      sendOrderConfirmation: jest.fn(),
      sendNewOrderNotification: jest.fn()
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const saga = new EnablerOrderFulfillmentSaga(
      facilitateOrderUseCase as never,
      inventoryService,
      paymentService,
      notificationService
    );
    const orderData = { buyerId: 'buyer-1', listingId: 'listing-1', quantity: 2 };

    await expect(saga.execute(orderData)).rejects.toThrow('Payment failed');

    expect(inventoryService.releaseReservation).toHaveBeenCalledWith('listing-1', 2);
    expect(notificationService.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Order Fulfillment Saga Failed:', expect.any(Error));
  });

  it('compensates even when facilitation fails before order id is assigned', async () => {
    const facilitateOrderUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('facilitation-failed'))
    };
    const inventoryService = {
      confirmReservation: jest.fn(),
      releaseReservation: jest.fn().mockResolvedValue(undefined)
    };
    const paymentService = {
      processPayment: jest.fn()
    };
    const notificationService = {
      sendOrderConfirmation: jest.fn(),
      sendNewOrderNotification: jest.fn()
    };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const saga = new EnablerOrderFulfillmentSaga(
      facilitateOrderUseCase as never,
      inventoryService,
      paymentService,
      notificationService
    );
    const orderData = { buyerId: 'buyer-1', listingId: 'listing-1', quantity: 2 };

    await expect(saga.execute(orderData)).rejects.toThrow('facilitation-failed');
    expect(inventoryService.releaseReservation).toHaveBeenCalledWith('listing-1', 2);
    expect(paymentService.processPayment).not.toHaveBeenCalled();
  });
});
