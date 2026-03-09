import { SellerPricingInput } from './seller-pricing-input.value-object';

describe('SellerPricingInput', () => {
  it('creates valid input and computes effective desired profit', () => {
    const withDesired = new SellerPricingInput(80000, 'electronics', 'new', 12000);
    const withoutDesired = new SellerPricingInput(80000, 'electronics', 'new');

    expect(withDesired.getEffectiveDesiredProfit(0.2)).toBe(12000);
    expect(withoutDesired.getEffectiveDesiredProfit(0.2)).toBe(16000);
  });

  it('validates base cost, category, condition, and desired profit', () => {
    expect(() => new SellerPricingInput(0, 'electronics', 'new')).toThrow('Base cost must be positive');
    expect(() => new SellerPricingInput(1000, ' ', 'new')).toThrow('Product category is required');
    expect(() => new SellerPricingInput(1000, 'electronics', 'bad' as never)).toThrow('Invalid condition');
    expect(() => new SellerPricingInput(1000, 'electronics', 'new', -1)).toThrow('Desired profit cannot be negative');
  });
});
