import { PhoneNumber } from '../../value-objects/phone-number.value-object';

describe('PhoneNumber Value Object - extra branches', () => {
  it('formats different national lengths', () => {
    const p7 = PhoneNumber.create('+1234567');
    expect(p7.formatForDisplay()).toContain('+123');

    const p8 = PhoneNumber.create('+12345678');
    expect(p8.formatForDisplay()).toContain('+123');

    const p9 = PhoneNumber.create('+123456789');
    expect(p9.formatForDisplay()).toContain('+123');

    const p10 = PhoneNumber.create('+123456789012');
    expect(p10.formatForDisplay()).toContain('+123');
  });

  it('returns unknown type for non-TZ numbers', () => {
    const p = PhoneNumber.create('+441234567890');
    expect(p.isTanzanian()).toBe(false);
    expect(p.getType()).toBe('unknown');
  });

  it('isValid static false for missing plus', () => {
    expect(PhoneNumber.isValid('255712345678')).toBe(false);
  });
});
