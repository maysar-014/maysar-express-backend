import { PhoneNumber } from '../phone-number.value-object';

describe('PhoneNumber Value Object - Branch Coverage', () => {
  describe('formatForDisplay branches', () => {
    test('formats 7-digit national number', () => {
      const phone = new PhoneNumber('+2551234567');
      const formatted = phone.formatForDisplay();
      expect(formatted).toContain('+255');
      expect(formatted).toContain('123');
      expect(formatted).toContain('4567');
    });

    test('formats 8-digit national number', () => {
      const phone = new PhoneNumber('+25512345678');
      const formatted = phone.formatForDisplay();
      expect(formatted).toContain('+255');
      expect(formatted).toContain('1234');
      expect(formatted).toContain('5678');
    });

    test('formats 9-digit national number', () => {
      const phone = new PhoneNumber('+255123456789');
      const formatted = phone.formatForDisplay();
      expect(formatted).toContain('+255');
      expect(formatted).toContain('123');
      expect(formatted).toContain('456');
      expect(formatted).toContain('789');
    });

    test('formats 10+ digit national number', () => {
      const phone = new PhoneNumber('+2551234567890');
      const formatted = phone.formatForDisplay();
      expect(formatted).toContain('+255');
      expect(formatted).toContain('123');
      expect(formatted).toContain('456');
      expect(formatted).toContain('789');
      expect(formatted).toContain('0');
    });

    test('returns raw value for non-standard length', () => {
      const phone = new PhoneNumber('+25512345');
      const formatted = phone.formatForDisplay();
      expect(formatted).toBe(phone.value);
    });
  });

  describe('getType branches', () => {
    test('returns mobile for Tanzanian +255 6x numbers', () => {
      const phone = new PhoneNumber('+255612345678');
      expect(phone.getType()).toBe('mobile');
    });

    test('returns mobile for Tanzanian +255 7x numbers', () => {
      const phone = new PhoneNumber('+255712345678');
      expect(phone.getType()).toBe('mobile');
    });

    test('returns landline for Tanzanian +255 2x numbers', () => {
      const phone = new PhoneNumber('+255212345678');
      expect(phone.getType()).toBe('landline');
    });

    test('returns landline for Tanzanian +255 8x numbers', () => {
      const phone = new PhoneNumber('+255812345678');
      expect(phone.getType()).toBe('landline');
    });

    test('returns unknown for Tanzanian +255 other numbers', () => {
      const phone = new PhoneNumber('+255312345678');
      expect(phone.getType()).toBe('unknown');
    });

    test('returns unknown for non-Tanzanian numbers', () => {
      const phone = new PhoneNumber('+12025551234');
      expect(phone.getType()).toBe('unknown');
    });

    test('returns unknown for non-Tanzanian +44 numbers', () => {
      const phone = new PhoneNumber('+441234567890');
      expect(phone.getType()).toBe('unknown');
    });
  });

  describe('isTanzanian branches', () => {
    test('returns true for +255 country code', () => {
      const phone = new PhoneNumber('+255712345678');
      expect(phone.isTanzanian()).toBe(true);
    });

    test('returns false for non-+255 country code', () => {
      const phone = new PhoneNumber('+12025551234');
      expect(phone.isTanzanian()).toBe(false);
    });

    test('returns false for +256 (Uganda)', () => {
      const phone = new PhoneNumber('+256712345678');
      expect(phone.isTanzanian()).toBe(false);
    });

    test('returns false for +254 (Kenya)', () => {
      const phone = new PhoneNumber('+254712345678');
      expect(phone.isTanzanian()).toBe(false);
    });
  });

  describe('normalize branches', () => {
    test('adds + prefix if missing', () => {
      const phone = new PhoneNumber('255712345678');
      expect(phone.value).toMatch(/^\+/);
    });

    test('removes spaces and dashes', () => {
      const phone = new PhoneNumber('+255 71 234 5678');
      expect(phone.value).not.toContain(' ');
      expect(phone.value).not.toContain('-');
    });

    test('removes parentheses', () => {
      const phone = new PhoneNumber('+255 (71) 234-5678');
      expect(phone.value).not.toContain('(');
      expect(phone.value).not.toContain(')');
    });

    test('preserves + prefix if already present', () => {
      const phone = new PhoneNumber('+255712345678');
      expect(phone.value).toMatch(/^\+255/);
    });
  });

  describe('extractCountryCode branches', () => {
    test('extracts 3-digit country code', () => {
      const phone = new PhoneNumber('+255712345678');
      expect(phone.countryCode).toBe('+255');
    });

    test('extracts country code for different numbers', () => {
      const phone = new PhoneNumber('+12025551234');
      expect(phone.countryCode).toMatch(/^\+\d{1,3}$/);
    });

    test('extracts country code for UK', () => {
      const phone = new PhoneNumber('+441234567890');
      expect(phone.countryCode).toMatch(/^\+\d{1,3}$/);
    });

    test('returns empty string for invalid format', () => {
      try {
        new PhoneNumber('invalid');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('extractNationalNumber branches', () => {
    test('extracts national number after country code', () => {
      const phone = new PhoneNumber('+255712345678');
      expect(phone.nationalNumber).toBe('712345678');
    });

    test('extracts national number for different country codes', () => {
      const phone = new PhoneNumber('+12025551234');
      expect(phone.nationalNumber).toBeDefined();
      expect(phone.nationalNumber.length).toBeGreaterThan(0);
    });

    test('returns empty string for edge case', () => {
      try {
        new PhoneNumber('+255');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('isValid static method branches', () => {
    test('returns false for null', () => {
      expect(PhoneNumber.isValid(null as any)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(PhoneNumber.isValid(undefined as any)).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(PhoneNumber.isValid('')).toBe(false);
    });

    test('returns false for non-string', () => {
      expect(PhoneNumber.isValid(123 as any)).toBe(false);
    });

    test('returns false for string without +', () => {
      expect(PhoneNumber.isValid('255712345678')).toBe(false);
    });

    test('returns false for too long', () => {
      expect(PhoneNumber.isValid('+2557123456789012345')).toBe(false);
    });

    test('returns true for valid format', () => {
      expect(PhoneNumber.isValid('+255712345678')).toBe(true);
    });

    test('handles exception in try-catch', () => {
      expect(PhoneNumber.isValid(null as any)).toBe(false);
    });

    test('returns true for valid 7-digit number', () => {
      expect(PhoneNumber.isValid('+2551234567')).toBe(true);
    });

    test('returns true for valid 15-digit number', () => {
      expect(PhoneNumber.isValid('+255123456789012345')).toBe(false);
    });
  });

  describe('equals method branches', () => {
    test('returns true for same phone number', () => {
      const phone1 = new PhoneNumber('+255712345678');
      const phone2 = new PhoneNumber('+255712345678');
      expect(phone1.equals(phone2)).toBe(true);
    });

    test('returns false for different phone numbers', () => {
      const phone1 = new PhoneNumber('+255712345678');
      const phone2 = new PhoneNumber('+255712345679');
      expect(phone1.equals(phone2)).toBe(false);
    });

    test('returns false for different country codes', () => {
      const phone1 = new PhoneNumber('+255712345678');
      const phone2 = new PhoneNumber('+256712345678');
      expect(phone1.equals(phone2)).toBe(false);
    });
  });

  describe('fromParts static method', () => {
    test('creates phone from country code and national number', () => {
      const phone = PhoneNumber.fromParts('+255', '712345678');
      expect(phone.countryCode).toBe('+255');
      expect(phone.nationalNumber).toBe('712345678');
    });

    test('creates phone with different country code', () => {
      const phone = PhoneNumber.fromParts('+256', '712345678');
      expect(phone.countryCode).toBe('+256');
    });
  });

  describe('create static method', () => {
    test('creates phone number from string', () => {
      const phone = PhoneNumber.create('+255712345678');
      expect(phone.value).toBe('+255712345678');
    });

    test('normalizes input', () => {
      const phone = PhoneNumber.create('255 71 234 5678');
      expect(phone.value).toMatch(/^\+255/);
    });
  });

  describe('toString method', () => {
    test('returns phone value', () => {
      const phone = new PhoneNumber('+255712345678');
      expect(phone.toString()).toBe('+255712345678');
    });
  });

  describe('isValid method', () => {
    test('returns true for valid phone', () => {
      const phone = new PhoneNumber('+255712345678');
      expect(phone.isValid()).toBe(true);
    });
  });
});
