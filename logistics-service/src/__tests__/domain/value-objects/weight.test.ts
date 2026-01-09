/**
 * Weight Value Object Tests
 *
 * Constitution Section 11: Domain tests must cover pure logic only
 * Constitution Section 4.1: Domain purity rule - no external dependencies
 */

import { Weight } from '../../../domain/value-objects/weight.value-object';

describe('Weight Value Object', () => {
  describe('create', () => {
    it('should create a valid Weight with positive value', () => {
      const weight = Weight.create(5.5);
      expect(weight.getValue()).toBe(5.5);
      expect(weight.getUnit()).toBe('kg');
    });

    it('should create a valid Weight with zero value', () => {
      const weight = Weight.create(0);
      expect(weight.getValue()).toBe(0);
      expect(weight.getUnit()).toBe('kg');
    });

    it('should create weight with specified unit', () => {
      const weight = Weight.create(10, 'lbs');
      expect(weight.getValue()).toBe(10);
      expect(weight.getUnit()).toBe('lbs');
    });

    it('should throw error for negative weight', () => {
      expect(() => Weight.create(-1)).toThrow('Weight cannot be negative');
    });

    it('should throw error for weight exceeding maximum', () => {
      expect(() => Weight.create(1001)).toThrow('Weight cannot exceed 1000kg');
    });

    it('should throw error for invalid unit', () => {
      expect(() => Weight.create(5, 'invalid' as any)).toThrow();
    });
  });

  describe('factory methods', () => {
    describe('fromKilograms', () => {
      it('should create weight in kilograms', () => {
        const weight = Weight.fromKilograms(5.5);
        expect(weight.getValue()).toBe(5.5);
        expect(weight.getUnit()).toBe('kg');
      });
    });

    describe('fromPounds', () => {
      it('should create weight in pounds', () => {
        const weight = Weight.fromPounds(10);
        expect(weight.getValue()).toBe(10);
        expect(weight.getUnit()).toBe('lbs');
      });
    });
  });

  describe('unit conversion', () => {
    describe('toKilograms', () => {
      it('should convert kg to kg (no change)', () => {
        const weight = Weight.create(5, 'kg');
        expect(weight.toKilograms()).toBe(5);
      });

      it('should convert lbs to kg', () => {
        const weight = Weight.create(10, 'lbs');
        expect(weight.toKilograms()).toBeCloseTo(4.5359, 4);
      });
    });

    describe('toPounds', () => {
      it('should convert lbs to lbs (no change)', () => {
        const weight = Weight.create(5, 'lbs');
        expect(weight.toPounds()).toBe(5);
      });

      it('should convert kg to lbs', () => {
        const weight = Weight.create(5, 'kg');
        expect(weight.toPounds()).toBeCloseTo(11.0231, 4);
      });
    });
  });

  describe('equals', () => {
    it('should return true for weights with same converted value', () => {
      const weight1 = Weight.create(5, 'kg');
      const weight2 = Weight.create(11.0231, 'lbs'); // ~5kg in lbs
      expect(weight1.equals(weight2)).toBe(true);
    });

    it('should return false for weights with different values', () => {
      const weight1 = Weight.create(5, 'kg');
      const weight2 = Weight.create(6, 'kg');
      expect(weight1.equals(weight2)).toBe(false);
    });

    it('should return true for same instance', () => {
      const weight = Weight.create(5, 'kg');
      expect(weight.equals(weight)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return formatted string with kg unit', () => {
      const weight = Weight.create(5.5, 'kg');
      expect(weight.toString()).toBe('5.5kg');
    });

    it('should return formatted string with lbs unit', () => {
      const weight = Weight.create(10, 'lbs');
      expect(weight.toString()).toBe('10lbs');
    });

    it('should handle whole numbers', () => {
      const weight = Weight.create(10, 'kg');
      expect(weight.toString()).toBe('10kg');
    });

    it('should handle decimal places', () => {
      const weight = Weight.create(2.75, 'kg');
      expect(weight.toString()).toBe('2.75kg');
    });
  });

  describe('comparison methods', () => {
    const weight1 = Weight.create(5.0, 'kg');
    const weight2 = Weight.create(10.0, 'kg');
    const weight3 = Weight.create(5.0, 'kg');

    describe('isGreaterThan', () => {
      it('should return true when weight is greater', () => {
        expect(weight2.isGreaterThan(weight1)).toBe(true);
      });

      it('should return false when weight is equal', () => {
        expect(weight1.isGreaterThan(weight3)).toBe(false);
      });

      it('should return false when weight is less', () => {
        expect(weight1.isGreaterThan(weight2)).toBe(false);
      });
    });

    describe('isLessThan', () => {
      it('should return true when weight is less', () => {
        expect(weight1.isLessThan(weight2)).toBe(true);
      });

      it('should return false when weight is equal', () => {
        expect(weight1.isLessThan(weight3)).toBe(false);
      });

      it('should return false when weight is greater', () => {
        expect(weight2.isLessThan(weight1)).toBe(false);
      });
    });

    // Note: Weight class uses 'equals' method, not 'isEqualTo'
  });

  describe('arithmetic operations', () => {
    describe('add', () => {
      it('should add two weights correctly', () => {
        const weight1 = Weight.create(5.0, 'kg');
        const weight2 = Weight.create(3.5, 'kg');
        const result = weight1.add(weight2);
        expect(result.getValue()).toBe(8.5);
        expect(result).toBeInstanceOf(Weight);
        expect(result.getUnit()).toBe('kg');
      });

      it('should handle zero addition', () => {
        const weight1 = Weight.create(5.0, 'kg');
        const zeroWeight = Weight.create(0, 'kg');
        const result = weight1.add(zeroWeight);
        expect(result.getValue()).toBe(5.0);
      });

      it('should convert units when adding different units', () => {
        const kgWeight = Weight.create(5, 'kg');
        const lbsWeight = Weight.create(2.20462, 'lbs'); // ~1kg in lbs
        const result = kgWeight.add(lbsWeight);
        expect(result.getValue()).toBeCloseTo(6.0, 1);
        expect(result.getUnit()).toBe('kg');
      });
    });
  });

  describe('value object immutability', () => {
    it('should be immutable - operations return new instances', () => {
      const weight1 = Weight.create(5.0, 'kg');
      const weight2 = Weight.create(3.0, 'kg');

      const result = weight1.add(weight2);

      expect(weight1.getValue()).toBe(5.0); // Original unchanged
      expect(weight2.getValue()).toBe(3.0); // Original unchanged
      expect(result.getValue()).toBe(8.0); // New instance
      expect(result).not.toBe(weight1); // Different instance
      expect(result).not.toBe(weight2); // Different instance
    });
  });

  describe('edge cases', () => {
    it('should handle very small weights', () => {
      const tinyWeight = Weight.create(0.001, 'kg');
      expect(tinyWeight.getValue()).toBe(0.001);
      expect(tinyWeight.toString()).toBe('0.001kg');
    });

    it('should handle maximum allowed weight', () => {
      const maxWeight = Weight.create(1000, 'kg');
      expect(maxWeight.getValue()).toBe(1000);
    });

    it('should handle unit conversions at boundaries', () => {
      const kgWeight = Weight.create(1000, 'kg');
      expect(kgWeight.toPounds()).toBeCloseTo(2204.62, 2);

      const lbsWeight = Weight.create(2204.62, 'lbs');
      expect(lbsWeight.toKilograms()).toBeCloseTo(1000, 2);
    });
  });
});
