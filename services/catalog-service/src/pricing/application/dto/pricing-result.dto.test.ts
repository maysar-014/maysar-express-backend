import type { PricingResultDTO } from './pricing-result.dto';

describe('PricingResultDTO', () => {
  it('supports pricing result contract fields', () => {
    const dto: PricingResultDTO = {
      final_base_price: 70000,
      platform_fee: 1400,
      mno_fee: 2800,
      threshold_fee: 200,
      customer_price_raw: 74400,
      customer_price_rounded: 74500,
      seller_net_revenue: 70000,
      seller_profit: 20000,
      health: {
        isHealthy: true,
        adjustments: []
      },
      applied_config: {
        min_profit_multiplier: 1.2,
        desired_multiplier: 1.4,
        category_multiplier: 1.6,
        platform_fee_pct: 0.02,
        mno_fee_pct: 0.04,
        threshold_fee_amount: 200,
        threshold_fee_trigger_base_price: 30000,
        customer_rounding_increment: 500,
        customer_rounding_mode: 'CEIL'
      }
    };

    expect(dto.final_base_price).toBe(70000);
    expect(dto.threshold_fee).toBe(200);
    expect(dto.health.isHealthy).toBe(true);
    expect(dto.applied_config.platform_fee_pct).toBe(0.02);
  });
});
