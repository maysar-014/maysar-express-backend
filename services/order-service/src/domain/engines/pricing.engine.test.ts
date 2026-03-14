import { PricingEngine } from './pricing.engine';

describe('PricingEngine', () => {
  it('uses in-memory fallback when api client is not provided', async () => {
    const engine = new PricingEngine();

    const result = await engine.calculatePrice({
      productVariantId: 'variant-1',
      quantity: 2,
      customerId: 'customer-1',
      currency: 'TZS'
    });

    expect(result).toEqual({
      basePrice: 50_000,
      finalPrice: 100_000,
      currency: 'TZS',
      discountApplied: 0,
      shippingCost: 0
    });
  });

  it('uses api client response and applies bulk discount', async () => {
    const apiClient = {
      get: jest.fn().mockResolvedValue({
        data: { basePrice: 10_000, shippingCost: 1_500 }
      })
    };
    const engine = new PricingEngine(apiClient);

    const result = await engine.calculatePrice({
      productVariantId: 'variant-1',
      quantity: 10,
      customerId: 'customer-1',
      currency: 'TZS'
    });

    expect(apiClient.get).toHaveBeenCalledWith('/pricing/variant-1?qty=10&customerId=customer-1');
    expect(result).toEqual({
      basePrice: 10_000,
      finalPrice: 95_000,
      currency: 'TZS',
      discountApplied: 0.05,
      shippingCost: 1_500
    });
  });

  it('falls back to defaults when api response is partial', async () => {
    const apiClient = {
      get: jest.fn().mockResolvedValue({ data: {} })
    };
    const engine = new PricingEngine(apiClient);

    const result = await engine.calculatePrice({
      productVariantId: 'variant-1',
      quantity: 1,
      customerId: 'customer-1',
      currency: 'USD'
    });

    expect(result.basePrice).toBe(50_000);
    expect(result.shippingCost).toBe(0);
    expect(result.discountApplied).toBe(0);
  });
});
