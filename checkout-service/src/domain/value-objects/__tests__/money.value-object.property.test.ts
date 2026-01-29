import fc from 'fast-check';
import { Money } from '../money.value-object';

describe('Money Value Object - Property-Based Tests', () => {
  describe('Arithmetic Properties', () => {
    it('should maintain commutativity for addition', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 10000 }),
        fc.float({ min: 0, max: 10000 }),
        (a, b) => {
          const m1 = new Money(a);
          const m2 = new Money(b);
          return m1.add(m2).getAmount() === m2.add(m1).getAmount();
        }
      ));
    });

    it('should maintain associativity for addition', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 5000 }),
        fc.float({ min: 0, max: 5000 }),
        fc.float({ min: 0, max: 5000 }),
        (a, b, c) => {
          const m1 = new Money(a);
          const m2 = new Money(b);
          const m3 = new Money(c);
          const left = m1.add(m2).add(m3).getAmount();
          const right = m1.add(m2.add(m3)).getAmount();
          return Math.abs(left - right) < 0.01;
        }
      ));
    });

    it('should maintain identity for addition', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 10000 }),
        (a) => {
          const m = new Money(a);
          const zero = new Money(0);
          return m.add(zero).getAmount() === m.getAmount();
        }
      ));
    });

    it('should maintain distributivity for multiplication', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 1000 }),
        fc.float({ min: 0, max: 1000 }),
        fc.float({ min: 0, max: 10 }),
        (a, b, factor) => {
          const m1 = new Money(a);
          const m2 = new Money(b);
          const left = m1.add(m2).multiply(factor).getAmount();
          const right = m1.multiply(factor).add(m2.multiply(factor)).getAmount();
          return Math.abs(left - right) < 0.01;
        }
      ));
    });
  });

  describe('Comparison Properties', () => {
    it('should maintain transitivity for greater than', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 3000 }),
        fc.float({ min: 0, max: 3000 }),
        fc.float({ min: 0, max: 3000 }),
        (a, b, c) => {
          const m1 = new Money(Math.min(a, b, c));
          const m2 = new Money(Math.max(a, b, c));
          const m3 = new Money((a + b + c) / 3);
          
          if (m1.isLessThan(m3) && m3.isLessThan(m2)) {
            return m1.isLessThan(m2);
          }
          return true;
        }
      ));
    });

    it('should maintain reflexivity for equality', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 10000 }),
        (a) => {
          const m = new Money(a);
          return m.isEqual(m);
        }
      ));
    });

    it('should maintain symmetry for equality', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 10000 }),
        (a) => {
          const m1 = new Money(a);
          const m2 = new Money(a);
          return m1.isEqual(m2) === m2.isEqual(m1);
        }
      ));
    });
  });

  describe('Invariant Properties', () => {
    it('should never produce negative money', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 10000 }),
        fc.float({ min: 0, max: 10000 }),
        (a, b) => {
          const m1 = new Money(a);
          const m2 = new Money(b);
          const result = m1.add(m2);
          return result.getAmount() >= 0;
        }
      ));
    });

    it('should maintain precision through operations', () => {
      fc.assert(fc.property(
        fc.float({ min: 0.01, max: 1000 }),
        fc.float({ min: 0.01, max: 1000 }),
        (a, b) => {
          const m1 = new Money(a);
          const m2 = new Money(b);
          const sum = m1.add(m2);
          const diff = sum.subtract(m1);
          return Math.abs(diff.getAmount() - m2.getAmount()) < 0.01;
        }
      ));
    });

    it('should handle multiplication identity', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 10000 }),
        (a) => {
          const m = new Money(a);
          return m.multiply(1).getAmount() === m.getAmount();
        }
      ));
    });
  });
});
