import { PricingEngine } from './pricing.engine';

describe('PricingEngine', () => {
  it('calculates price from the pricing service response', async () => {
    const apiClient = {
      get: jest.fn().mockResolvedValue({
        data: { basePrice: 50_000, shippingCost: 0 }
      })
    };
    const engine = new PricingEngine(apiClient);

    const result = await engine.calculatePrice({
      productVariantId: 'variant-1',
      quantity: 2,
      customerId: 'customer-1',
      currency: 'TZS'
    });

    expect(apiClient.get).toHaveBeenCalledWith('/pricing/variant-1?qty=2&customerId=customer-1');
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

  it('throws when the pricing service omits base price data', async () => {
    const apiClient = {
      get: jest.fn().mockResolvedValue({ data: {} })
    };
    const engine = new PricingEngine(apiClient);

    await expect(engine.calculatePrice({
      productVariantId: 'variant-1',
      quantity: 1,
      customerId: 'customer-1',
      currency: 'USD'
    })).rejects.toThrow('base price missing');
  });

  it('applies no discount below bulk threshold', async () => {
    const apiClient = {
      get: jest.fn().mockResolvedValue({
        data: { basePrice: 10_000, shippingCost: 1_500 }
      })
    };
    const engine = new PricingEngine(apiClient);

    const result = await engine.calculatePrice({
      productVariantId: 'variant-1',
      quantity: 1,
      customerId: 'customer-1',
      currency: 'USD'
    });

    expect(result.basePrice).toBe(10_000);
    expect(result.finalPrice).toBe(10_000);
    expect(result.discountApplied).toBe(0);
    expect(result.shippingCost).toBe(1_500);
  });
});
