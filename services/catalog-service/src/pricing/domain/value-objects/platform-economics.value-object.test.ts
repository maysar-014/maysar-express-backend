import { PlatformEconomics } from './platform-economics.value-object';

describe('PlatformEconomics', () => {
  it('computes total deduction rate for valid economics values', () => {
    const economics = new PlatformEconomics(12, 3, 0.1, 0.05, 'TZS', 0);
    expect(economics.getTotalDeductionRate()).toBe(0.15);
  });

  it('validates percentage and currency constraints', () => {
    expect(() => new PlatformEconomics(-1, 2, 0.1, 0.05, 'TZS')).toThrow('Percentages must be positive');
    expect(() => new PlatformEconomics(99, 2, 0.1, 0.05, 'TZS')).toThrow('Total deductions must be less than 100%');
    expect(() => new PlatformEconomics(10, 2, -0.1, 0.05, 'TZS')).toThrow('Margin percentages must be positive');
    expect(() => new PlatformEconomics(10, 2, 0.1, 0.05, 'USD' as never)).toThrow('Only TZS currency is supported');
  });
});
