/**
 * E2E Tests - Controllers
 * Tests complete request/response flow
 */

import { CartController } from '../../controllers/cart.controller';
import { CheckoutController } from '../../controllers/checkout.controller';
import { Request, Response } from 'express';

const cartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const userId = 'usr_test_0001';
const productId = 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const sourceCartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAW';
const targetCartId = 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAX';

describe('CartController E2E', () => {
  let controller: CartController;
  let mockRepository: {
    save: jest.Mock;
    getById: jest.Mock;
    getByUserId: jest.Mock;
    delete: jest.Mock;
  };
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn().mockResolvedValue({ items: [] }),
      getByUserId: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined)
    };
    controller = new CartController(mockRepository);

    mockRequest = {
      body: {},
      headers: { 'x-correlation-id': 'corr-123' }
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  it('should add item to cart', async () => {
    mockRequest.body = {
      cartId,
      userId,
      productId,
      quantity: 2,
      priceAtTime: 50
    };

    await controller.addToCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should handle validation errors', async () => {
    mockRequest.body = { cartId };

    await controller.addToCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('should remove item from cart', async () => {
    mockRequest.body = {
      cartId,
      userId,
      productId
    };
    mockRepository.getById.mockResolvedValueOnce({
      id: cartId,
      userId,
      items: [{ productId, quantity: 1, priceAtTime: 50 }]
    });

    await controller.removeFromCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should update item quantity', async () => {
    mockRequest.body = {
      cartId,
      userId,
      productId,
      quantity: 5
    };
    mockRepository.getById.mockResolvedValueOnce({
      id: cartId,
      userId,
      items: [{ productId, quantity: 1, priceAtTime: 50 }]
    });

    await controller.updateCartItem(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should get cart', async () => {
    mockRequest.params = { cartId };
    (mockRequest as Request & { userId?: string }).userId = userId;

    await controller.getCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should clear cart', async () => {
    mockRequest.params = { cartId };
    mockRequest.body = { userId };
    mockRepository.getById.mockResolvedValueOnce({
      id: cartId,
      userId,
      items: [{ productId, quantity: 1, priceAtTime: 50 }]
    });

    await controller.clearCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should resolve current cart for authenticated user', async () => {
    Object.assign(mockRequest, { user: { userId } });
    mockRepository.getByUserId.mockResolvedValueOnce({
      id: cartId,
      userId,
      items: [{ productId, quantity: 1, priceAtTime: 50 }]
    });

    await controller.getCurrentCart(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should merge guest cart into target cart', async () => {
    mockRequest.body = {
      sourceCartId,
      targetCartId,
      userId
    };
    mockRepository.getById
      .mockResolvedValueOnce({
        id: sourceCartId,
        userId,
        items: [{ productId, quantity: 2, priceAtTime: 50 }]
      })
      .mockResolvedValueOnce({
        id: targetCartId,
        userId,
        items: [{ productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAG', quantity: 1, priceAtTime: 100 }]
      });

    await controller.mergeCarts(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockRepository.delete).toHaveBeenCalledWith(sourceCartId);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

describe('CheckoutController E2E', () => {
  let controller: CheckoutController;
  let mockCheckoutRepository: {
    saveCheckoutSession: jest.Mock;
    getSession: jest.Mock;
    saveSession: jest.Mock;
  };
  let mockEventBus: {
    publish: jest.Mock;
  };
  let mockCheckoutOrderRepository: {
    findByCheckoutSessionId: jest.Mock;
    createFromSession: jest.Mock;
  };
  let mockQuoteValidationService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
      const sessionFixture = {
        id: 'session-1',
        cartId,
        userId,
      enablerId: undefined,
      enablerCode: undefined,
      status: 'initiated',
      shippingAddressId: 'addr-1',
        billingAddressId: 'addr-2',
        shippingMethodId: 'ship-1',
        shippingCost: 10,
        totalAmount: 50000,
        expiresAt: new Date('2026-03-23T12:00:00.000Z'),
        createdAt: new Date('2026-03-23T11:00:00.000Z'),
        updatedAt: new Date('2026-03-23T11:30:00.000Z')
      };

    mockCheckoutRepository = {
      saveCheckoutSession: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn().mockResolvedValue(sessionFixture),
      saveSession: jest.fn().mockResolvedValue(undefined)
    };
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    };
    mockCheckoutOrderRepository = {
      findByCheckoutSessionId: jest.fn().mockResolvedValue(null),
      createFromSession: jest.fn().mockResolvedValue({ id: 'ord_checkout_test_001' })
    };
    // Quote validation is now mandatory (checkout security enforcement):
    // a stub returning a valid active quote keeps the happy-path tests focused
    // on controller wiring; rejection paths are covered in the use-case tests.
    mockQuoteValidationService = {
      validate: jest.fn().mockResolvedValue({
        valid: true,
        deliveryFee: 10,
        pricingVersion: 2,
      }),
      markConsumed: jest.fn().mockResolvedValue(undefined),
    } as any;

    controller = new CheckoutController(
      mockCheckoutRepository,
      mockEventBus,
      undefined,
      undefined,
      mockCheckoutOrderRepository,
      mockQuoteValidationService
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

  it('should initiate checkout', async () => {
    mockRequest.body = {
      cartId,
      userId,
      shippingAddressId: 'addr-1',
      billingAddressId: 'addr-2',
      shippingMethodId: 'ship-1',
      shippingCost: 10,
      quoteId: 'qt_e2e_test_001'
    };

    await controller.initiateCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should get checkout session', async () => {
    mockRequest.params = { sessionId: 'session-1' };

    await controller.getCheckoutSession(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should confirm checkout', async () => {
    mockRequest.body = {
      sessionId: 'session-1',
      paymentMethodId: 'pm-1'
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'OrderCreated',
      expect.any(Object)
    );
  });

  it('should include the order number in the confirm checkout response', async () => {
    // The response only ever carries an ORDER NUMBER (ORD-YYYYMMDD-NLNL), produced by the
    // synchronous order placement - never the checkout id.
    (globalThis as any).__placeOrderUseCase = {
      execute: jest.fn().mockResolvedValue({ orderId: 'ORD-20260927-3C8B' })
    };
    // A session with items and a seller is what the synchronous placement path requires.
    mockCheckoutRepository.getSession.mockResolvedValueOnce({
      ...(await mockCheckoutRepository.getSession()),
      items: [{ productId: 'cat_pro_test_001', quantity: 1, price: 50000, weight: 1 }],
      metadata: { sellerId: 'usr_seller_test_001', orderSource: 'CART' }
    });
    mockRequest.body = {
      sessionId: 'session-1',
      paymentMethodId: 'pm-1'
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.success).toBe(true);
    expect(jsonCall.data.orderId).toBe('ORD-20260927-3C8B');
    expect(jsonCall.data.checkoutId).toBeUndefined();
    delete (globalThis as any).__placeOrderUseCase;
  });

  it('should not fabricate an order id when no order was placed', async () => {
    delete (globalThis as any).__placeOrderUseCase;
    mockRequest.body = {
      sessionId: 'session-1',
      paymentMethodId: 'pm-1'
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.success).toBe(true);
    // The checkout id is reported under its own field; no order id is invented.
    expect(jsonCall.data.orderId).toBeUndefined();
    expect(jsonCall.data.checkoutId).toBeDefined();
  });

  it('should return same orderId on repeated confirm (idempotency)', async () => {
    (globalThis as any).__placeOrderUseCase = {
      execute: jest.fn().mockResolvedValue({ orderId: 'ORD-20260927-3C8B' })
    };
    mockCheckoutRepository.getSession.mockResolvedValue({
      ...(await mockCheckoutRepository.getSession()),
      items: [{ productId: 'cat_pro_test_001', quantity: 1, price: 50000, weight: 1 }],
      metadata: { sellerId: 'usr_seller_test_001', orderSource: 'CART' }
    });
    mockCheckoutOrderRepository.findByCheckoutSessionId.mockResolvedValueOnce({ id: 'ord_checkout_test_001' });
    mockRequest.body = {
      sessionId: 'session-1',
      paymentMethodId: 'pm-1'
    };
    mockRequest.headers = {
      'x-correlation-id': 'corr-123',
      'idempotency-key': 'idem-confirm-001'
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);
    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    const calls = (mockResponse.json as jest.Mock).mock.calls;
    // Both calls should return success with orderId
    expect(calls[0][0].data.orderId).toBe('ORD-20260927-3C8B');
    expect(calls[1][0].data.orderId).toBe('ORD-20260927-3C8B');
    delete (globalThis as any).__placeOrderUseCase;
  });

  it('should reject checkout confirmation below the minimum basket value', async () => {
    mockCheckoutRepository.getSession.mockResolvedValueOnce({
      id: 'session-low',
      cartId,
      userId,
      enablerId: undefined,
      enablerCode: undefined,
      status: 'initiated',
      shippingAddressId: 'addr-1',
      billingAddressId: 'addr-2',
      shippingMethodId: 'ship-1',
      shippingCost: 10,
      totalAmount: 49999,
      expiresAt: new Date('2026-03-23T12:00:00.000Z'),
      createdAt: new Date('2026-03-23T11:00:00.000Z'),
      updatedAt: new Date('2026-03-23T11:30:00.000Z')
    });
    mockRequest.body = {
      sessionId: 'session-1',
      paymentMethodId: 'pm-1'
    };

    await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(422);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'MINIMUM_BASKET_VALUE_NOT_MET'
        })
      })
    );
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should handle idempotency', async () => {
    mockRequest.body = {
      cartId,
      userId,
      shippingAddressId: 'addr-1',
      billingAddressId: 'addr-2',
      shippingMethodId: 'ship-1',
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
