import { CostProtectedStrategy } from './cost-protected.strategy';
import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';

describe('CostProtectedStrategy', () => {
  it('returns base gross price unchanged with phase1 adjustment marker', () => {
    const strategy = new CostProtectedStrategy();
    const input = new SellerPricingInput(100000, 'electronics', 'new', 20000);
    const economics = new PlatformEconomics(10, 2, 0.1, 0.05, 'TZS');

    const result = strategy.suggest(input, economics, 150000);

    expect(strategy.phase).toBe('phase1');
    expect(result.suggestedPrice).toBe(150000);
    expect(result.adjustments).toEqual(['Phase 1: cost-protected pricing applied']);
  });
});
