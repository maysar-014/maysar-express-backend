import { PlatformValidatorService } from './platform-validator.service';
import { PlatformEconomics } from '../value-objects/platform-economics.value-object';

describe('PlatformValidatorService', () => {
  it('keeps price unchanged when platform margin meets minimum', () => {
    const service = new PlatformValidatorService();
    const economics = new PlatformEconomics(12, 2, 0.1, 0.05, 'TZS');

    const result = service.validate(100000, economics);

    expect(result.price).toBe(100000);
    expect(result.adjustments).toEqual([]);
  });

  it('adjusts price and emits explanation when margin is below threshold', () => {
    const service = new PlatformValidatorService();
    const economics = new PlatformEconomics(5, 2, 0.1, 10, 'TZS');

    const result = service.validate(100000, economics);

    expect(result.price).toBe(50000);
    expect(result.adjustments[0]).toContain('Platform margin enforced');
  });
});
