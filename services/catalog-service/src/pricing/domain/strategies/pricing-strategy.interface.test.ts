import type { IPricingStrategy } from './pricing-strategy.interface';

describe('IPricingStrategy contract', () => {
  it('supports suggest method with expected return shape', () => {
    const strategy: IPricingStrategy = {
      phase: 'phase1',
      suggest: jest.fn().mockReturnValue({
        suggestedPrice: 1100,
        adjustments: ['competitor-adjustment']
      })
    };

    const result = strategy.suggest({} as never, {} as never, 1000, {} as never);
    expect(strategy.phase).toBe('phase1');
    expect(result.suggestedPrice).toBe(1100);
    expect(result.adjustments).toContain('competitor-adjustment');
  });
});
