import { TaxId } from '../tax-id.value-object';
import { BusinessValidationError } from '../../errors/business.errors';

describe('TaxId Value Object', () => {
  describe('create', () => {
    it('should create with valid 9-digit TIN', () => {
      const taxId = TaxId.create('123456789');
      expect(taxId.getValue()).toBe('123456789');
    });

    it('should strip non-digits', () => {
      const taxId = TaxId.create('123-456-789');
      expect(taxId.getValue()).toBe('123456789');
    });

    it('should throw for invalid format', () => {
      expect(() => TaxId.create('12345')).toThrow(BusinessValidationError);
    });
  });

  describe('isValid', () => {
    it('should validate 9-digit format', () => {
      expect(TaxId.isValid('123456789')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(TaxId.isValid('')).toBe(false);
      expect(TaxId.isValid('12345')).toBe(false);
      expect(TaxId.isValid('1234567890')).toBe(false);
    });
  });
});
