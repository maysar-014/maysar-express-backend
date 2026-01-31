import { RegistrationNumber } from '../registration-number.value-object';
import { InvalidRegistrationNumberError } from '../../errors/business.errors';

describe('RegistrationNumber Value Object', () => {
  describe('create', () => {
    it('should create with valid TZ format', () => {
      const reg = RegistrationNumber.create('TZ-DAR-12345');
      expect(reg.getValue()).toBe('TZ-DAR-12345');
    });

    it('should throw for invalid format', () => {
      expect(() => RegistrationNumber.create('invalid')).toThrow(InvalidRegistrationNumberError);
    });
  });

  describe('isValid', () => {
    it('should validate TZ-{region}-{number} format', () => {
      expect(RegistrationNumber.isValid('TZ-DAR-12345')).toBe(true);
      expect(RegistrationNumber.isValid('TZ-MB-9999')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(RegistrationNumber.isValid('')).toBe(false);
      expect(RegistrationNumber.isValid('TZ-123')).toBe(false);
    });
  });

  describe('getRegion and getNumber', () => {
    it('should extract region and number', () => {
      const reg = RegistrationNumber.create('TZ-DAR-12345');
      expect(reg.getRegion()).toBe('DAR');
      expect(reg.getNumber()).toBe('12345');
    });
  });
});
