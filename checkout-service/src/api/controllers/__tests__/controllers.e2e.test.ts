import { CartController } from '../cart.controller';
import { CheckoutController } from '../checkout.controller';
import { Request, Response } from 'express';

describe('CartController E2E Tests', () => {
  let controller: CartController;
  let mockRepository: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn()
    };
    controller = new CartController(mockRepository);

    mockRequest = { body: {} };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('Add to Cart', () => {
    it('should add item to cart', async () => {
      mockRequest.body = {
        cartId: 'cart-1',
        userId: 'user-1',
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 50
      };
      mockRepository.getById.mockResolvedValue({ items: [] });

      await controller.addToCart(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors', async () => {
      mockRequest.body = { cartId: 'cart-1' };
      mockRepository.getById.mockRejectedValue(new Error('DB Error'));

      await controller.addToCart(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Remove from Cart', () => {
    it('should remove item from cart', async () => {
      mockRequest.body = {
        cartId: 'cart-1',
        userId: 'user-1',
        productId: 'prod-1'
      };
      mockRepository.getById.mockResolvedValue({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });

      await controller.removeFromCart(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('Get Cart', () => {
    it('should retrieve cart', async () => {
      mockRequest.params = { cartId: 'cart-1', userId: 'user-1' };
      mockRepository.getById.mockResolvedValue({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });

      await controller.getCart(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 for non-existent cart', async () => {
      mockRequest.params = { cartId: 'cart-999', userId: 'user-1' };
      mockRepository.getById.mockResolvedValue(null);

      await controller.getCart(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Clear Cart', () => {
    it('should clear all items from cart', async () => {
      mockRequest.body = { cartId: 'cart-1', userId: 'user-1' };

      await controller.clearCart(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});

describe('CheckoutController E2E Tests', () => {
  let controller: CheckoutController;
  let mockCheckoutRepository: any;
  let mockCartRepository: any;
  let mockEventBus: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockCheckoutRepository = {
      saveSession: jest.fn(),
      getSession: jest.fn(),
      saveOrder: jest.fn()
    };
    mockCartRepository = {
      getById: jest.fn()
    };
    mockEventBus = {
      publish: jest.fn()
    };

    controller = new CheckoutController(
      mockCheckoutRepository,
      mockCartRepository,
      mockEventBus
    );

    mockRequest = { body: {} };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('Initiate Checkout', () => {
    it('should initiate checkout successfully', async () => {
      mockRequest.body = {
        cartId: 'cart-1',
        userId: 'user-1',
        shippingAddressId: 'addr-1',
        billingAddressId: 'addr-2',
        shippingMethodId: 'ship-1',
        shippingCost: 10
      };
      mockCartRepository.getById.mockResolvedValue({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 100 }]
      });

      await controller.initiateCheckout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle checkout errors', async () => {
      mockRequest.body = { cartId: 'cart-1' };
      mockCartRepository.getById.mockRejectedValue(new Error('DB Error'));

      await controller.initiateCheckout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Get Checkout Session', () => {
    it('should retrieve checkout session', async () => {
      mockRequest.params = { sessionId: 'session-1' };
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        status: 'initiated'
      });

      await controller.getCheckoutSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 for non-existent session', async () => {
      mockRequest.params = { sessionId: 'session-999' };
      mockCheckoutRepository.getSession.mockResolvedValue(null);

      await controller.getCheckoutSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Confirm Checkout', () => {
    it('should confirm checkout and create order', async () => {
      mockRequest.body = {
        sessionId: 'session-1',
        paymentMethodId: 'pm-1'
      };
      mockCheckoutRepository.getSession.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        totalAmount: 100
      });

      await controller.confirmCheckout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'OrderCreated',
        expect.any(Object)
      );
    });
  });
});
