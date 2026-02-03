import { Money } from '../money.value-object';

describe('Money.value-object', () => {
  describe('Construction', () => {
    it('should create from dollars', () => {
      const m = new Money(100);
      expect(m.getAmount()).toBe(100);
    });

    it('should reject negative', () => {
      expect(() => new Money(-10)).toThrow();
    });

    it('should handle decimals', () => {
      const m = new Money(99.99);
      expect(m.getAmount()).toBe(99.99);
    });

    it('should create from cents', () => {
      const m = Money.fromCents(10050);
      expect(m.getAmount()).toBe(100.50);
    });
  });

  describe('Arithmetic', () => {
    it('should add', () => {
      expect(new Money(50).add(new Money(30)).getAmount()).toBe(80);
    });

    it('should subtract', () => {
      expect(new Money(100).subtract(new Money(30)).getAmount()).toBe(70);
    });

    it('should multiply', () => {
      expect(new Money(50).multiply(2).getAmount()).toBe(100);
    });

    it('should reject negative subtraction', () => {
      expect(() => new Money(30).subtract(new Money(100))).toThrow();
    });

    it('should reject negative multiplication', () => {
      expect(() => new Money(50).multiply(-1)).toThrow();
    });
  });

  describe('Comparisons', () => {
    it('should compare greater than', () => {
      expect(new Money(100).isGreaterThan(new Money(50))).toBe(true);
    });

    it('should compare less than', () => {
      expect(new Money(50).isLessThan(new Money(100))).toBe(true);
    });

    it('should compare equality', () => {
      expect(new Money(100).isEqual(new Money(100))).toBe(true);
    });

    it('should check zero', () => {
      expect(new Money(0).isZero()).toBe(true);
    });
  });

  describe('Precision', () => {
    it('should maintain through operations', () => {
      let total = new Money(0);
      for (let i = 0; i < 100; i++) {
        total = total.add(new Money(0.01));
      }
      expect(total.getAmount()).toBe(1);
    });

    it('should prevent floating-point errors', () => {
      const result = new Money(0.1).add(new Money(0.2));
      expect(result.isEqual(new Money(0.3))).toBe(true);
    });

    it('should handle large amounts', () => {
      const m = new Money(999999999.99);
      expect(m.getAmount()).toBe(999999999.99);
    });
  });

  describe('Invariants', () => {
    it('should maintain a + b - b = a', () => {
      const a = new Money(123.45);
      const b = new Money(67.89);
      expect(a.add(b).subtract(b).isEqual(a)).toBe(true);
    });

    it('should never produce negative', () => {
      const m1 = new Money(100);
      const m2 = new Money(50);
      expect(m1.add(m2).getAmount()).toBeGreaterThanOrEqual(0);
    });

    it('should maintain identity: a * 1 = a', () => {
      const m = new Money(100);
      expect(m.multiply(1).isEqual(m)).toBe(true);
    });

    it('should handle zero: a * 0 = 0', () => {
      expect(new Money(100).multiply(0).isZero()).toBe(true);
    });
  });
});
