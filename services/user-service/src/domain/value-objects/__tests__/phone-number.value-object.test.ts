import { PhoneNumber } from '../../value-objects/phone-number.value-object';

describe('PhoneNumber Value Object', () => {
  it('creates and normalizes phone numbers', () => {
    const p = PhoneNumber.create('+255712345678');
    expect(p.value).toBe('+255712345678');
    expect(p.isValid()).toBe(true);
    expect(p.isTanzanian()).toBe(true);
    expect(p.getType()).toBe('mobile');
  });

  it('formats for display and fromParts', () => {
    const p = PhoneNumber.fromParts('+255', '712345678');
    expect(p.toString()).toBe('+255712345678');
    const disp = p.formatForDisplay();
    expect(typeof disp).toBe('string');
  });

  it('invalid numbers throw', () => {
    expect(() => PhoneNumber.create('12345')).toThrow();
    expect(PhoneNumber.isValid('+12345678901')).toBe(true);
    expect(PhoneNumber.isValid('not-a-number')).toBe(false);
  });
});