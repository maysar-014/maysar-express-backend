/**
 * Initiate Checkout Use Case Tests
 * 
 * Coverage Target: 90% (use case orchestration)
 * Tests: Happy path, validation, error handling, event publishing
 */

import { InitiateCheckoutUseCase, CheckoutRepository, EventBus, CartRepository } from '../initiate-checkout.use-case';
import { PricingPolicy } from '../../../domain/policies/pricing.policy';

describe('InitiateCheckoutUseCase', () => {
  let useCase: InitiateCheckoutUseCase;
  let mockCheckoutRepository: jest.Mocked<CheckoutRepository>;
  let mockCartRepository: jest.Mocked<CartRepository>;
  let mockEventBus: jest.Mocked<EventBus>;
  let pricingPolicy: PricingPolicy;

  beforeEach(() => {
    pricingPolicy = new PricingPolicy({
      taxRate: 0.1,
      shippingCost: 10,
      minOrderForFreeShipping: 100
    });

    mockCheckoutRepository = {
      saveCheckoutSession: jest.fn().mockResolvedValue(undefined),
      getCheckoutSession: jest.fn()
    };

    mockCartRepository = {
      getCart: jest.fn().mockResolvedValue({
        id: 'cart-1',
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      })
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    };

    useCase = new InitiateCheckoutUseCase(
      pricingPolicy,
      mockCheckoutRepository,
      mockCartRepository,
      mockEventBus
    );
  });

  describe('Happy Path', () => {
    it('should initiate checkout successfully', async () => {
      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('initiated');
      expect(result.pricing).toBeDefined();
    });

    it('should calculate correct pricing', async () => {
      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.pricing?.subtotal).toBe(100);
      expect(result.pricing?.taxAmount).toBe(10);
      expect(result.pricing?.shippingCost).toBe(10);
      expect(result.pricing?.total).toBe(120);
    });

    it('should save checkout session', async () => {
      await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(mockCheckoutRepository.saveCheckoutSession).toHaveBeenCalled();
      const savedSession = mockCheckoutRepository.saveCheckoutSession.mock.calls[0][0];
      expect(savedSession.cartId).toBe('cart-1');
      expect(savedSession.userId).toBe('user-1');
    });

    it('should publish CheckoutInitiated event', async () => {
      await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'CheckoutInitiated',
        expect.objectContaining({
          cartId: 'cart-1',
          userId: 'user-1',
          totalAmount: 120
        })
      );
    });

    it('should set checkout expiration to 1 hour', async () => {
      const beforeTime = Date.now();
      await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );
      const afterTime = Date.now();

      const savedSession = mockCheckoutRepository.saveCheckoutSession.mock.calls[0][0];
      const expirationTime = savedSession.expiresAt.getTime();

      expect(expirationTime).toBeGreaterThanOrEqual(beforeTime + 3600000 - 1000);
      expect(expirationTime).toBeLessThanOrEqual(afterTime + 3600000 + 1000);
    });
  });

  describe('Validation Errors', () => {
    it('should reject when cart not found', async () => {
      mockCartRepository.getCart.mockResolvedValueOnce(null);

      const result = await useCase.execute(
        'cart-999',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'cartId',
          message: 'Cart not found'
        })
      );
    });

    it('should reject when cart is empty', async () => {
      mockCartRepository.getCart.mockResolvedValueOnce({
        id: 'cart-1',
        items: []
      });

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Cart is empty')
        })
      );
    });

    it('should reject when shipping address missing', async () => {
      const result = await useCase.execute(
        'cart-1',
        'user-1',
        '',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Shipping address')
        })
      );
    });

    it('should reject when billing address missing', async () => {
      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        '',
        'ship-1',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Billing address')
        })
      );
    });

    it('should reject when shipping method missing', async () => {
      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        '',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Shipping method')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle cart repository error', async () => {
      mockCartRepository.getCart.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'system',
          message: 'Database connection failed'
        })
      );
    });

    it('should handle checkout repository error', async () => {
      mockCheckoutRepository.saveCheckoutSession.mockRejectedValueOnce(
        new Error('Save failed')
      );

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'system',
          message: 'Save failed'
        })
      );
    });

    it('should handle event bus error gracefully', async () => {
      mockEventBus.publish.mockRejectedValueOnce(
        new Error('Event publishing failed')
      );

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'system',
          message: 'Event publishing failed'
        })
      );
    });
  });

  describe('Free Shipping Threshold', () => {
    it('should apply free shipping for orders over threshold', async () => {
      mockCartRepository.getCart.mockResolvedValueOnce({
        id: 'cart-1',
        items: [
          { productId: 'prod-1', quantity: 1, priceAtTime: 150 }
        ]
      });

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.pricing?.shippingCost).toBe(0);
    });

    it('should charge shipping for orders below threshold', async () => {
      mockCartRepository.getCart.mockResolvedValueOnce({
        id: 'cart-1',
        items: [
          { productId: 'prod-1', quantity: 1, priceAtTime: 50 }
        ]
      });

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.pricing?.shippingCost).toBe(10);
    });
  });

  describe('Event Publishing', () => {
    it('should include all required event data', async () => {
      await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      const eventCall = mockEventBus.publish.mock.calls[0];
      const eventData = eventCall[1];

      expect(eventData).toHaveProperty('checkoutId');
      expect(eventData).toHaveProperty('cartId');
      expect(eventData).toHaveProperty('userId');
      expect(eventData).toHaveProperty('totalAmount');
      expect(eventData).toHaveProperty('timestamp');
    });

    it('should publish event after successful save', async () => {
      let saveCallCount = 0;
      let publishCallCount = 0;

      mockCheckoutRepository.saveCheckoutSession.mockImplementation(async () => {
        saveCallCount++;
      });

      mockEventBus.publish.mockImplementation(async () => {
        publishCallCount++;
      });

      await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(saveCallCount).toBe(1);
      expect(publishCallCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle large cart', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        productId: `prod-${i}`,
        quantity: 1,
        priceAtTime: 10
      }));

      mockCartRepository.getCart.mockResolvedValueOnce({
        id: 'cart-1',
        items
      });

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(true);
      expect(result.pricing?.subtotal).toBe(1000);
    });

    it('should handle decimal prices', async () => {
      mockCartRepository.getCart.mockResolvedValueOnce({
        id: 'cart-1',
        items: [
          { productId: 'prod-1', quantity: 3, priceAtTime: 19.99 }
        ]
      });

      const result = await useCase.execute(
        'cart-1',
        'user-1',
        'addr-1',
        'addr-2',
        'ship-1',
        10
      );

      expect(result.success).toBe(true);
      expect(result.pricing?.subtotal).toBe(59.97);
    });
  });
});
