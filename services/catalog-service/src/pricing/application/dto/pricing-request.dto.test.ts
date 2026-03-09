import { validateCalculatePriceRequest } from './pricing-request.dto';

describe('pricing-request DTO validation', () => {
  it('parses valid pricing requests', () => {
    const parsed = validateCalculatePriceRequest({
      baseCost: 80000,
      desiredProfit: 12000,
      productCategory: 'electronics',
      condition: 'new',
      commissionPercentage: 12,
      paymentGatewayPercentage: 2,
      minimumSellerMarginPercentage: 10,
      minimumPlatformMarginPercentage: 8,
      deliverySubsidy: 0,
      phase: 'phase2',
      market: {
        demandLevel: 'high',
        salesVelocity: 0.8
      }
    });

    expect(parsed.baseCost).toBe(80000);
    expect(parsed.market?.demandLevel).toBe('high');
  });

  it('rejects invalid pricing requests', () => {
    expect(() =>
      validateCalculatePriceRequest({
        baseCost: -1,
        productCategory: '',
        condition: 'new',
        commissionPercentage: 120,
        paymentGatewayPercentage: 2,
        minimumSellerMarginPercentage: 10,
        minimumPlatformMarginPercentage: 8,
        phase: 'phase1'
      })
    ).toThrow();
  });
});
