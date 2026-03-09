import type { PricingService } from '../shared-contracts/pricing-service-contracts';

describe('pricing-service contracts', () => {
  it('exposes pricing command and event shapes via backward-compatible alias', () => {
    const command: PricingService.Commands.CalculatePrice = {
      baseCost: 50000,
      desiredProfit: 10000,
      productCategory: 'electronics',
      condition: 'new',
      commissionPercentage: 10,
      paymentGatewayPercentage: 2,
      minimumSellerMarginPercentage: 8,
      minimumPlatformMarginPercentage: 5,
      phase: 'phase2'
    };
    const event: PricingService.Events.PriceCalculated = {
      productId: 'product-1',
      finalPrice: 70000,
      sellerNetRevenue: 60000,
      sellerProfit: 10000,
      platformRevenue: 5000,
      isHealthy: true,
      adjustments: [],
      warnings: [],
      calculatedAt: new Date('2026-03-09T00:00:00.000Z')
    };

    expect(command.phase).toBe('phase2');
    expect(event.isHealthy).toBe(true);
  });
});
