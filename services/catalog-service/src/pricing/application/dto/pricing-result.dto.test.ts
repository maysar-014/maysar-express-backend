import type { PricingResultDTO } from './pricing-result.dto';

describe('PricingResultDTO', () => {
  it('supports pricing result contract fields', () => {
    const dto: PricingResultDTO = {
      finalPrice: 1200,
      sellerNetRevenue: 1000,
      sellerProfit: 200,
      platformRevenue: 50,
      isHealthy: true,
      adjustments: ['rounding:up'],
      warnings: []
    };

    expect(dto.finalPrice).toBe(1200);
    expect(dto.adjustments).toContain('rounding:up');
    expect(dto.isHealthy).toBe(true);
  });
});
