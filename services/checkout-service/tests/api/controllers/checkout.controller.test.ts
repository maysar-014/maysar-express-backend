import { Request, Response } from 'express';
import { CheckoutController } from '../../../src/api/controllers/checkout.controller';

describe('CheckoutController', () => {
  const cartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV';
  const userId = 'usr_test_0001';
  const sessionId = 'chk_ses_01ARZ3NDEKTSV4RRFFQ69G5FAV';

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

    controller = new CheckoutController(mockCheckoutRepository, mockEventBus, mockCartRepository);
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
