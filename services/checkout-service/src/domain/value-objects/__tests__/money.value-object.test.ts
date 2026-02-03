/**
 * Money Value Object Tests
 * 
 * Coverage Target: 98% (critical business logic)
 * Tests: Pure arithmetic, precision, edge cases
 */

import { Money } from '../money.value-object';

describe('Money Value Object', () => {
  describe('Construction', () => {
    it('should create money from dollars', () => {
      const money = new Money(100);
      expect(money.getAmount()).toBe(100);
    });

    it('should handle decimal amounts', () => {
      const money = new Money(99.99);
      expect(money.getAmount()).toBe(99.99);
    });

    it('should reject negative amounts', () => {
      expect(() => new Money(-10)).toThrow('Money amount cannot be negative');
    });

    it('should handle zero', () => {
      const money = new Money(0);
      expect(money.getAmount()).toBe(0);
      expect(money.isZero()).toBe(true);
    });

    it('should create from cents', () => {
      const money = Money.fromCents(10050);
      expect(money.getAmount()).toBe(100.50);
      expect(money.getCents()).toBe(10050);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should add two money amounts', () => {
      const m1 = new Money(50);
      const m2 = new Money(30);
      const result = m1.add(m2);
      expect(result.getAmount()).toBe(80);
    });

    it('should add with decimal precision', () => {
      const m1 = new Money(10.50);
      const m2 = new Money(20.25);
      const result = m1.add(m2);
      expect(result.getAmount()).toBe(30.75);
    });

    it('should subtract money amounts', () => {
      const m1 = new Money(100);
      const m2 = new Money(30);
      const result = m1.subtract(m2);
      expect(result.getAmount()).toBe(70);
    });

    it('should reject subtraction resulting in negative', () => {
      const m1 = new Money(30);
      const m2 = new Money(100);
      expect(() => m1.subtract(m2)).toThrow('Cannot subtract more than available');
    });

    it('should multiply by factor', () => {
      const money = new Money(50);
      const result = money.multiply(2);
      expect(result.getAmount()).toBe(100);
    });

    it('should multiply with decimal factor', () => {
      const money = new Money(100);
      const result = money.multiply(0.1);
      expect(result.getAmount()).toBe(10);
    });

    it('should reject negative multiplication factor', () => {
      const money = new Money(50);
      expect(() => money.multiply(-1)).toThrow('Multiplication factor cannot be negative');
    });

    it('should handle zero multiplication', () => {
      const money = new Money(100);
      const result = money.multiply(0);
      expect(result.getAmount()).toBe(0);
    });
  });

  describe('Comparisons', () => {
    it('should compare greater than', () => {
      const m1 = new Money(100);
      const m2 = new Money(50);
      expect(m1.isGreaterThan(m2)).toBe(true);
      expect(m2.isGreaterThan(m1)).toBe(false);
    });

    it('should compare less than', () => {
      const m1 = new Money(50);
      const m2 = new Money(100);
      expect(m1.isLessThan(m2)).toBe(true);
      expect(m2.isLessThan(m1)).toBe(false);
    });

    it('should compare equality', () => {
      const m1 = new Money(100);
      const m2 = new Money(100);
      const m3 = new Money(50);
      expect(m1.isEqual(m2)).toBe(true);
      expect(m1.isEqual(m3)).toBe(false);
    });

    it('should handle decimal equality', () => {
      const m1 = new Money(99.99);
      const m2 = new Money(99.99);
      expect(m1.isEqual(m2)).toBe(true);
    });
  });

  describe('Precision', () => {
    it('should maintain precision through operations', () => {
      const m1 = new Money(10.01);
      const m2 = new Money(20.02);
      const m3 = new Money(30.03);
      const result = m1.add(m2).add(m3);
      expect(result.getAmount()).toBe(60.06);
    });

    it('should handle rounding correctly', () => {
      const money = new Money(100);
      const result = money.multiply(0.333);
      expect(result.getCents()).toBe(3330);
    });

    it('should prevent floating-point errors', () => {
      const m1 = new Money(0.1);
      const m2 = new Money(0.2);
      const result = m1.add(m2);
      expect(result.getAmount()).toBe(0.3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      const money = new Money(999999999.99);
      expect(money.getAmount()).toBe(999999999.99);
    });

    it('should handle very small amounts', () => {
      const money = new Money(0.01);
      expect(money.getAmount()).toBe(0.01);
    });

    it('should handle multiple decimal places', () => {
      const money = new Money(123.456);
      expect(money.getAmount()).toBe(123.46);
      expect(money.getCents()).toBe(12346);
    });
  });
});
