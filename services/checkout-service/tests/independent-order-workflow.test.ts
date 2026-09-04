import { InitiateCheckoutUseCase } from '../src/application/use-cases/initiate-checkout.use-case';
import { PricingPolicy } from '../src/domain/policies/pricing.policy';

describe('Independent Order Workflows & Seller Verification', () => {
  let mockCheckoutRepo: any;
  let mockCartRepo: any;
  let pricingPolicy: PricingPolicy;
  let useCase: InitiateCheckoutUseCase;

  beforeEach(() => {
    mockCheckoutRepo = {
      saveCheckoutSession: jest.fn().mockResolvedValue(undefined),
      getCheckoutSession: jest.fn(),
    };
    mockCartRepo = {
      getCart: jest.fn().mockResolvedValue({
        id: 'cart-123',
        userId: 'user-1',
        items: [{ productId: 'cart-prod-1', quantity: 2, priceAtTime: 10000 }]
      }),
      clearCart: jest.fn().mockResolvedValue(undefined),
    };
    pricingPolicy = new PricingPolicy({
      taxRate: 0.18,
      shippingCost: 5000,
      minOrderForFreeShipping: 100000
    });
    useCase = new InitiateCheckoutUseCase(pricingPolicy, mockCheckoutRepo, mockCartRepo);
  });

  test('Direct Purchase (orderSource: DIRECT) does NOT query or mutate cart repository', async () => {
    const result = await useCase.execute(
      'direct-cart',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      5000,
      undefined,
      {
        orderSource: 'DIRECT',
        items: [{ productId: 'direct-prod-1', quantity: 1, priceAtTime: 50000 }]
      }
    );

    expect(result.success).toBe(true);
    expect(result.data.metadata.orderSource).toBe('DIRECT');
    expect(mockCartRepo.getCart).not.toHaveBeenCalled();
    expect(mockCheckoutRepo.saveCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ orderSource: 'DIRECT' })
      })
    );
  });

  test('Cart Purchase (orderSource: CART) fetches items from cart repository', async () => {
    const result = await useCase.execute(
      'cart-123',
      'user-1',
      'addr-1',
      'addr-2',
      'ship-1',
      5000,
      undefined,
      { orderSource: 'CART' }
    );

    expect(result.success).toBe(true);
    expect(result.data.metadata.orderSource).toBe('CART');
    expect(mockCartRepo.getCart).toHaveBeenCalledWith('cart-123');
  });
});
