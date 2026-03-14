import { validateCalculatePriceRequest } from './pricing-request.dto';

describe('pricing-request DTO validation', () => {
  it('parses valid pricing requests', () => {
    const parsed = validateCalculatePriceRequest({
      cost: 80000,
      desired_margin: 1.45,
      category_multiplier: 1.6,
      pricing_mode: 'BALANCED'
    });

    expect(parsed.cost).toBe(80000);
    expect(parsed.pricing_mode).toBe('BALANCED');
  });

  it('rejects invalid pricing requests', () => {
    expect(() =>
      validateCalculatePriceRequest({
        cost: 0,
        desired_margin: -1
      })
    ).toThrow();
  });
});
