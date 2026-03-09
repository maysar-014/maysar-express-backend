import { DynamicPricingStrategy } from './dynamic-pricing.strategy';

describe('DynamicPricingStrategy', () => {
  const strategy = new DynamicPricingStrategy();

  it('applies market clamp, demand multiplier, and aging discount with base floor', () => {
    const result = strategy.suggest(
      {} as never,
      {} as never,
      100,
      {
        isAvailable: () => true,
        marketAveragePrice: 110,
        demandLevel: 'high',
        salesVelocity: 0.3
      } as never
    );

    expect(result.suggestedPrice).toBeGreaterThanOrEqual(100);
    expect(result.adjustments[0]).toBe('Phase 3: dynamic pricing applied');
    expect(result.adjustments).toContain('Demand multiplier applied: high (1.1x)');
    expect(result.adjustments).toContain('Aging discount applied: low velocity (0.97x)');
  });

  it('returns base-aligned price when no market context is available', () => {
    const result = strategy.suggest({} as never, {} as never, 150);

    expect(result).toEqual({
      suggestedPrice: 150,
      adjustments: ['Phase 3: dynamic pricing applied']
    });
  });
});

