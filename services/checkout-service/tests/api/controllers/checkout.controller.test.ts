import { Request, Response } from 'express';
import { CheckoutController } from '../../../src/api/controllers/checkout.controller';

describe('CheckoutController', () => {
  const cartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV';
  const userId = 'usr_test_0001';
  const sessionId = 'chk_ses_01ARZ3NDEKTSV4RRFFQ69G5FAV';
  const orderId = 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV';

  let controller: CheckoutController;
  let mockCheckoutRepository: {
    saveCheckoutSession: jest.Mock;
    getSession: jest.Mock;
    saveSession: jest.Mock;
  };
  let mockEventBus: {
    publish: jest.Mock;
  };
  let mockCartRepository: {
    getCart: jest.Mock;
  };
  let mockCheckoutOrderRepository: {
    findByCheckoutSessionId: jest.Mock;
    createFromSession: jest.Mock;
  };
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockCheckoutRepository = {
      saveCheckoutSession: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn().mockResolvedValue({
        id: sessionId,
        cartId,
        userId,
        status: 'initiated',
        shippingAddressId: 'addr_1',
        billingAddressId: 'addr_2',
        shippingMethodId: 'ship_1',
        shippingCost: 10,
        totalAmount: 110,
        expiresAt: new Date('2026-03-28T01:00:00.000Z'),
        createdAt: new Date('2026-03-28T00:00:00.000Z'),
        updatedAt: new Date('2026-03-28T00:30:00.000Z')
      }),
      saveSession: jest.fn().mockResolvedValue(undefined)
    };
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    };
    mockCartRepository = {
      getCart: jest.fn().mockResolvedValue({
        id: cartId,
        userId,
        items: [
          {
            productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            quantity: 1,
            priceAtTime: 100
          }
        ]
      })
    };
    mockCheckoutOrderRepository = {
      findByCheckoutSessionId: jest.fn().mockResolvedValue(null),
      createFromSession: jest.fn().mockResolvedValue({ id: orderId })
    };

    controller = new CheckoutController(
      mockCheckoutRepository,
      mockEventBus,
      mockCartRepository,
      undefined,
      mockCheckoutOrderRepository
    );
    mockRequest = {
      body: {},
      headers: { 'x-correlation-id': 'corr-123' }
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  it('initiates checkout', async () => {
    mockRequest.body = {
      cartId,
      userId,
      shippingAddressId: 'addr_1',
      billingAddressId: 'addr_2',
      shippingMethodId: 'ship_1',
      shippingCost: 10
    };

    await controller.initiateCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockCheckoutRepository.saveCheckoutSession).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns an existing checkout session', async () => {
    mockRequest.params = { id: sessionId };

    await controller.getCheckoutSession(mockRequest as Request, mockResponse as Response);

    expect(mockCheckoutRepository.getSession).toHaveBeenCalledWith(sessionId);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('confirms checkout', async () => {
    mockRequest.params = { id: sessionId };
    mockRequest.body = { paymentMethodId: 'pay_mth_01ARZ3NDEKTSV4RRFFQ69G5FAV' };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockCheckoutRepository.saveSession).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith('OrderCreated', expect.objectContaining({
      checkoutId: sessionId,
      userId
    }));
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('confirmCheckout includes orderId in response when checkoutOrderRepository is provided', async () => {
    mockRequest.params = { id: sessionId };
    mockRequest.body = { paymentMethodId: 'pay_mth_01ARZ3NDEKTSV4RRFFQ69G5FAV' };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockCheckoutOrderRepository.findByCheckoutSessionId).toHaveBeenCalledWith(sessionId);
    expect(mockCheckoutOrderRepository.createFromSession).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ orderId })
      })
    );
    const responseArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(responseArg.data.orderId).toBe(orderId);
    expect(responseArg.data.orderId).not.toBeNull();
    expect(responseArg.data.orderId).not.toBeUndefined();
  });

  it('confirmCheckout returns existing orderId when order already exists (idempotent upsert)', async () => {
    const existingOrder = { id: orderId };
    mockCheckoutOrderRepository.findByCheckoutSessionId.mockResolvedValue(existingOrder);

    mockRequest.params = { id: sessionId };
    mockRequest.body = { paymentMethodId: 'pay_mth_01ARZ3NDEKTSV4RRFFQ69G5FAV' };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockCheckoutOrderRepository.findByCheckoutSessionId).toHaveBeenCalledWith(sessionId);
    // createFromSession should NOT be called since the order already exists
    expect(mockCheckoutOrderRepository.createFromSession).not.toHaveBeenCalled();

    const responseArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(responseArg.data.orderId).toBe(orderId);
  });

  it('confirmCheckout idempotency cache stores enriched response with orderId', async () => {
    const idempotencyKey = 'idem-confirm-123';
    mockRequest.params = { id: sessionId };
    mockRequest.body = { paymentMethodId: 'pay_mth_01ARZ3NDEKTSV4RRFFQ69G5FAV' };
    mockRequest.headers = {
      'x-correlation-id': 'corr-123',
      'idempotency-key': idempotencyKey
    };

    // First call — creates the order
    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    // Reset mocks to track second call
    (mockResponse.json as jest.Mock).mockClear();
    mockCheckoutOrderRepository.findByCheckoutSessionId.mockClear();
    mockCheckoutOrderRepository.createFromSession.mockClear();

    // Second call — should hit idempotency cache
    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    // Repository should not be called again on idempotent repeat
    expect(mockCheckoutOrderRepository.createFromSession).not.toHaveBeenCalled();

    // Response should still contain orderId from cached response
    const responseArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(responseArg.data.orderId).toBe(orderId);
  });

  it('confirmCheckout without checkoutOrderRepository still succeeds (orderId undefined)', async () => {
    // Controller without checkoutOrderRepository
    const controllerWithoutOrderRepo = new CheckoutController(
      mockCheckoutRepository,
      mockEventBus,
      mockCartRepository
    );

    mockRequest.params = { id: sessionId };
    mockRequest.body = { paymentMethodId: 'pay_mth_01ARZ3NDEKTSV4RRFFQ69G5FAV' };

    await controllerWithoutOrderRepo.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const responseArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(responseArg.data.orderId).toBeUndefined();
  });

  it('respects idempotency keys', async () => {
    mockRequest.body = {
      cartId,
      userId,
      shippingAddressId: 'addr_1',
      billingAddressId: 'addr_2',
      shippingMethodId: 'ship_1',
      shippingCost: 10
    };
    mockRequest.headers = {
      'x-correlation-id': 'corr-123',
      'idempotency-key': 'idem-123'
    };

    await controller.initiateCheckout(mockRequest as Request, mockResponse as Response);
    await controller.initiateCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledTimes(2);
  });
});
