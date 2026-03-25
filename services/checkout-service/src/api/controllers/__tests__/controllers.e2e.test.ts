/**
 * E2E Tests - Controllers
 * Tests complete request/response flow
 */

import { CartController } from '../../controllers/cart.controller';
import { CheckoutController } from '../../controllers/checkout.controller';
import { Request, Response } from 'express';

describe('CartController E2E', () => {
  let controller: CartController;
  let mockRepository: any;
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
      cartId: 'cart-1',
      userId: 'user-1',
      productId: 'prod-1',
      quantity: 2,
      priceAtTime: 50
    };

    await controller.addToCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should handle validation errors', async () => {
    mockRequest.body = { cartId: 'cart-1' };

    await controller.addToCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('should remove item from cart', async () => {
    mockRequest.body = {
      cartId: 'cart-1',
      userId: 'user-1',
      productId: 'prod-1'
    };
    mockRepository.getById.mockResolvedValueOnce({
      items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
    });

    await controller.removeFromCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should update item quantity', async () => {
    mockRequest.body = {
      cartId: 'cart-1',
      userId: 'user-1',
      productId: 'prod-1',
      quantity: 5
    };
    mockRepository.getById.mockResolvedValueOnce({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
    });

    await controller.updateCartItem(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should get cart', async () => {
    mockRequest.params = { cartId: 'cart-1' };
    (mockRequest as any).userId = 'user-1';

    await controller.getCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should clear cart', async () => {
    mockRequest.body = { cartId: 'cart-1', userId: 'user-1' };

    await controller.clearCart(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should resolve current cart for authenticated user', async () => {
    (mockRequest as any).user = { userId: 'user-1' };
    mockRepository.getByUserId.mockResolvedValueOnce({
      id: 'chk_cart_existing',
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
    });

    await controller.getCurrentCart(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.getByUserId).toHaveBeenCalledWith('user-1');
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('should merge guest cart into target cart', async () => {
    mockRequest.body = {
      sourceCartId: 'guest-cart-1',
      targetCartId: 'user-cart-1',
      userId: 'user-1'
    };
    mockRepository.getById
      .mockResolvedValueOnce({
        userId: 'guest-user',
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }]
      })
      .mockResolvedValueOnce({
        userId: 'user-1',
        items: [{ productId: 'prod-2', quantity: 1, priceAtTime: 100 }]
      });

    await controller.mergeCarts(mockRequest as Request, mockResponse as Response);

    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockRepository.delete).toHaveBeenCalledWith('guest-cart-1');
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

describe('CheckoutController E2E', () => {
  let controller: CheckoutController;
  let mockCheckoutRepository: any;
  let mockEventBus: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    const sessionFixture = {
      id: 'session-1',
      cartId: 'cart-1',
      userId: 'user-1',
      enablerId: undefined,
      enablerCode: undefined,
      status: 'initiated',
      shippingAddressId: 'addr-1',
      billingAddressId: 'addr-2',
      shippingMethodId: 'ship-1',
      shippingCost: 10,
      totalAmount: 110,
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

    controller = new CheckoutController(
      mockCheckoutRepository,
      mockEventBus
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
      cartId: 'cart-1',
      userId: 'user-1',
      shippingAddressId: 'addr-1',
      billingAddressId: 'addr-2',
      shippingMethodId: 'ship-1',
      shippingCost: 10
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

  it('should handle idempotency', async () => {
    mockRequest.body = {
      cartId: 'cart-1',
      userId: 'user-1',
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
