import { MaysarPricingEngine } from './maysar-pricing.engine';

describe('MaysarPricingEngine standalone flow', () => {
  const engine = new MaysarPricingEngine();

  it('handles small-cost product pricing', () => {
    const result = engine.calculate({ cost: 5_000 });

    expect(result.final_base_price).toBeGreaterThanOrEqual(6_000);
    expect(result.customer_price_rounded % 500).toBe(0);
    expect(result.customer_price_rounded).toBeGreaterThanOrEqual(result.customer_price_raw);
    expect(result.health.isHealthy).toBe(true);
  });

  it('handles mid-cost product pricing', () => {
    const result = engine.calculate({ cost: 100_000, desired_margin: 1.45, pricing_mode: 'BALANCED' });

    expect(result.final_base_price).toBeGreaterThanOrEqual(120_000);
    expect(result.platform_fee).toBeGreaterThanOrEqual(200);
    expect(result.platform_fee).toBeLessThanOrEqual(3_000);
    expect(result.threshold_fee).toBe(200);
  });

  it('clamps platform fee to minimum for low base price', () => {
    const result = engine.calculate({ cost: 1_000, desired_margin: 1.2 });
    expect(result.platform_fee).toBe(200);
    expect(result.threshold_fee).toBe(0);
  });

  it('clamps platform fee to maximum for high base price', () => {
    const result = engine.calculate({ cost: 1_000_000, desired_margin: 1.6 });
    expect(result.platform_fee).toBe(3_000);
  });

  it('upgrades desired margin when below minimum multiplier', () => {
    const result = engine.calculate({ cost: 50_000, desired_margin: 1.05 });

    expect(result.applied_config.desired_multiplier).toBe(1.2);
    expect(result.health.adjustments.join(' ')).toContain('below minimum');
  });

  it('enforces category cap on extreme desired margin', () => {
    const result = engine.calculate({
      cost: 80_000,
      desired_margin: 3,
      category_multiplier: 1.6
    });

    expect(result.final_base_price).toBe(128_000);
    expect(result.health.adjustments.join(' ')).toContain('category cap applied');
  });

  it('applies health correction when engine commission would make seller unprofitable', () => {
    const result = engine.calculate({
      cost: 10_000,
      desired_margin: 1.2,
      engine_commission: 3_000
    });

    expect(result.final_base_price).toBe(12_000);
    expect(result.health.adjustments.join(' ')).toContain('health correction applied');
  });

  it('throws on zero or negative cost', () => {
    expect(() => engine.calculate({ cost: 0 })).toThrow('Cost must be a positive integer');
    expect(() => engine.calculate({ cost: -100 })).toThrow('Cost must be a positive integer');
  });

  it('adds threshold fee only when final base price exceeds 30000', () => {
    const below = engine.calculate({ cost: 20_000, desired_margin: 1.4 });
    const above = engine.calculate({ cost: 25_000, desired_margin: 1.4 });

    expect(below.final_base_price).toBe(28_000);
    expect(below.threshold_fee).toBe(0);
    expect(above.final_base_price).toBe(35_000);
    expect(above.threshold_fee).toBe(200);
  });

  it('always rounds customer price upward to next 500', () => {
    const crafted = engine.calculate({ cost: 50_000, desired_margin: 1.4 });

    expect(crafted.customer_price_raw).toBe(74400);
    expect(crafted.customer_price_rounded).toBe(74500);
    expect(crafted.customer_price_rounded % 500).toBe(0);
  });
});
