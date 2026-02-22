import { formatCurrency, calculateTotal, generateId } from './utilities';

describe('Utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('should handle decimals', () => {
      expect(formatCurrency(99.99, 'USD')).toBe('$99.99');
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total correctly', () => {
      const items = [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 1 }
      ];
      expect(calculateTotal(items)).toBe(250);
    });

    it('should handle empty array', () => {
      expect(calculateTotal([])).toBe(0);
    });
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate valid format', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9-]+$/);
    });
  });
});
