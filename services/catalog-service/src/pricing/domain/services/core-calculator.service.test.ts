import { CoreCalculatorService } from './core-calculator.service';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';
import { SellerPricingInput } from '../value-objects/seller-pricing-input.value-object';

describe('CoreCalculatorService', () => {
  it('calculates required net revenue and reverse gross price', () => {
    const service = new CoreCalculatorService();
    const input = new SellerPricingInput(100000, 'electronics', 'new', 20000);
    const economics = new PlatformEconomics(10, 2, 0.15, 0.05, 'TZS');

    const requiredNet = service.calculateRequiredNetRevenue(input, economics);
    const gross = service.reverseCalculateGrossPrice(requiredNet, economics);

    expect(requiredNet).toBe(120000);
    expect(gross).toBeCloseTo(136363.636, 2);
  });

  it('falls back to minimum margin when desired profit is omitted', () => {
    const service = new CoreCalculatorService();
    const input = new SellerPricingInput(100000, 'electronics', 'new');
    const economics = new PlatformEconomics(10, 2, 0.2, 0.05, 'TZS');

    expect(service.calculateRequiredNetRevenue(input, economics)).toBe(120000);
  });
});
