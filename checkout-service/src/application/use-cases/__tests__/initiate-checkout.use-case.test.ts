/**
 * Use Case Tests
 * Tests application orchestration logic
 */

import { InitiateCheckoutUseCase } from '../initiate-checkout.use-case';
import { PricingPolicy } from '../../../domain/policies/pricing.policy';

describe('InitiateCheckoutUseCase', () => {
  let useCase: InitiateCheckoutUseCase;
  let mockCheckoutRepository: any;
  let mockCartRepository: any;
  let mockEventBus: any;
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
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }]
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
  });

  it('should reject missing required fields', async () => {
    const result = await useCase.execute(
      'cart-1',
      'user-1',
      '',
      'addr-2',
      'ship-1',
      10
    );

    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('should handle database errors', async () => {
    mockCheckoutRepository.saveCheckoutSession.mockRejectedValueOnce(
      new Error('Database error')
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
        message: 'Database error'
      })
    );
  });

  it('should apply free shipping threshold', async () => {
    mockCartRepository.getCart.mockResolvedValueOnce({
      id: 'cart-1',
      items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 150 }]
    });

    const result = await useCase.execute(
      'cart-1',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      0
    );

    expect(result.pricing?.shippingCost).toBe(0);
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
