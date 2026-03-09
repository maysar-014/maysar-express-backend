import { AssistedPricingStrategy } from './assisted-pricing.strategy';

describe('AssistedPricingStrategy', () => {
  const strategy = new AssistedPricingStrategy();

  it('returns base price when market data is unavailable', () => {
    const result = strategy.suggest({} as never, {} as never, 100);

    expect(result).toEqual({
      suggestedPrice: 100,
      adjustments: ['Phase 2: no market data, using base price']
    });
  });

  it('applies clamped market-assisted suggestion and keeps floor at base price', () => {
    const result = strategy.suggest(
      {} as never,
      {} as never,
      100,
      {
        isAvailable: () => true,
        marketAveragePrice: 200
      } as never
    );

    expect(result.suggestedPrice).toBe(114.99999999999999);
    expect(result.adjustments[0]).toContain('Phase 2: market-assisted suggestion applied');
  });
});

