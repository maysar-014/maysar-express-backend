/**
 * Money Value Object - Property-Based Tests
 * Validates mathematical properties without external dependencies
 */

import { Money } from '../money.value-object';

describe('Money Value Object - Property-Based Tests', () => {
  describe('Arithmetic Properties', () => {
    it('should maintain commutativity for addition', () => {
      const testCases = [
        [10, 20],
        [100.50, 50.25],
        [0, 100],
        [1.01, 2.02]
      ];

      testCases.forEach(([a, b]) => {
        const m1 = new Money(a);
        const m2 = new Money(b);
        expect(m1.add(m2).getAmount()).toBe(m2.add(m1).getAmount());
      });
    });

    it('should maintain associativity for addition', () => {
      const testCases = [
        [10, 20, 30],
        [100.50, 50.25, 25.75],
        [1.01, 2.02, 3.03]
      ];

      testCases.forEach(([a, b, c]) => {
        const m1 = new Money(a);
        const m2 = new Money(b);
        const m3 = new Money(c);
        const left = m1.add(m2).add(m3).getAmount();
        const right = m1.add(m2.add(m3)).getAmount();
        expect(Math.abs(left - right)).toBeLessThan(0.01);
      });
    });

    it('should maintain identity for addition', () => {
      const testCases = [10, 100.50, 0, 1.01];

      testCases.forEach(a => {
        const m = new Money(a);
        const zero = new Money(0);
        expect(m.add(zero).getAmount()).toBe(m.getAmount());
      });
    });

    it('should maintain distributivity for multiplication', () => {
      const testCases = [
        [10, 20, 2],
        [100.50, 50.25, 1.5],
        [1.01, 2.02, 3]
      ];

      testCases.forEach(([a, b, factor]) => {
        const m1 = new Money(a);
        const m2 = new Money(b);
        const left = m1.add(m2).multiply(factor).getAmount();
        const right = m1.multiply(factor).add(m2.multiply(factor)).getAmount();
        expect(Math.abs(left - right)).toBeLessThan(0.01);
      });
    });
  });

  describe('Comparison Properties', () => {
    it('should maintain transitivity for greater than', () => {
      const m1 = new Money(10);
      const m2 = new Money(20);
      const m3 = new Money(30);

      if (m1.isLessThan(m2) && m2.isLessThan(m3)) {
        expect(m1.isLessThan(m3)).toBe(true);
      }
    });

    it('should maintain reflexivity for equality', () => {
      const testCases = [10, 100.50, 0, 1.01];

      testCases.forEach(a => {
        const m = new Money(a);
        expect(m.isEqual(m)).toBe(true);
      });
    });

    it('should maintain symmetry for equality', () => {
      const testCases = [10, 100.50, 0, 1.01];

      testCases.forEach(a => {
        const m1 = new Money(a);
        const m2 = new Money(a);
        expect(m1.isEqual(m2)).toBe(m2.isEqual(m1));
      });
    });
  });

  describe('Invariant Properties', () => {
    it('should never produce negative money', () => {
      const testCases = [
        [10, 20],
        [100.50, 50.25],
        [0, 100]
      ];

      testCases.forEach(([a, b]) => {
        const m1 = new Money(a);
        const m2 = new Money(b);
        const result = m1.add(m2);
        expect(result.getAmount()).toBeGreaterThanOrEqual(0);
      });
    });

    it('should maintain precision through operations', () => {
      const testCases = [
        [10.50, 20.25],
        [100.01, 50.02],
        [1.01, 2.02]
      ];

      testCases.forEach(([a, b]) => {
        const m1 = new Money(a);
        const m2 = new Money(b);
        const sum = m1.add(m2);
        const diff = sum.subtract(m1);
        expect(Math.abs(diff.getAmount() - m2.getAmount())).toBeLessThan(0.01);
      });
    });

    it('should handle multiplication identity', () => {
      const testCases = [10, 100.50, 0, 1.01];

      testCases.forEach(a => {
        const m = new Money(a);
        expect(m.multiply(1).getAmount()).toBe(m.getAmount());
      });
    });
  });
});
