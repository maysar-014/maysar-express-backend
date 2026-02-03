/**
 * Money Value Object Unit Tests
 * Constitution Section 6: Testing Constitution
 */

import { Money } from '../../../domain/value-objects/money.value-object';

describe('Money Value Object', () => {
  describe('Creation', () => {
    it('should create money with valid amount and currency', () => {
      const money = Money.create(1000, 'TZS');
      expect(money.getAmount()).toBe(1000);
      expect(money.getCurrency()).toBe('TZS');
    });

    it('should throw error for negative amount', () => {
      expect(() => Money.create(-100, 'TZS')).toThrow('Amount must be non-negative');
    });

    it('should throw error for zero amount', () => {
      expect(() => Money.create(0, 'TZS')).toThrow('Amount must be positive');
    });

    it('should create money from cents', () => {
      const money = Money.fromCents(100000, 'TZS'); // 1000 TZS
      expect(money.getAmount()).toBe(1000);
    });
  });

  describe('Operations', () => {
    let money1: Money;
    let money2: Money;

    beforeEach(() => {
      money1 = Money.create(1000, 'TZS');
      money2 = Money.create(500, 'TZS');
    });

    it('should add two money objects', () => {
      const result = money1.add(money2);
      expect(result.getAmount()).toBe(1500);
      expect(result.getCurrency()).toBe('TZS');
    });

    it('should subtract money objects', () => {
      const result = money1.subtract(money2);
      expect(result.getAmount()).toBe(500);
    });

    it('should multiply by scalar', () => {
      const result = money1.multiply(1.1);
      expect(result.getAmount()).toBe(1100);
    });

    it('should calculate percentage', () => {
      const result = money1.percentage(10);
      expect(result.getAmount()).toBe(100);
    });

    it('should throw error when adding different currencies', () => {
      const usdMoney = Money.create(100, 'USD');
      expect(() => money1.add(usdMoney)).toThrow('Cannot operate on different currencies');
    });
  });

  describe('Comparisons', () => {
    let money1: Money;
    let money2: Money;
    let money3: Money;

    beforeEach(() => {
      money1 = Money.create(1000, 'TZS');
      money2 = Money.create(1000, 'TZS');
      money3 = Money.create(500, 'TZS');
    });

    it('should check equality', () => {
      expect(money1.equals(money2)).toBe(true);
      expect(money1.equals(money3)).toBe(false);
    });

    it('should compare amounts', () => {
      expect(money1.isGreaterThan(money3)).toBe(true);
      expect(money3.isLessThan(money1)).toBe(true);
    });

    it('should check if zero', () => {
      expect(money1.isZero()).toBe(false);
      expect(Money.zero('TZS').isZero()).toBe(true);
    });
  });

  describe('Formatting', () => {
    it('should format as string', () => {
      const money = Money.create(1234567, 'TZS');
      expect(money.toString()).toBe('1,234,567 TZS');
    });

    it('should format with custom locale', () => {
      const money = Money.create(1234567, 'TZS');
      expect(money.format('en-US')).toBe('TZS 1,234,567');
    });
  });

  describe('Business Rules', () => {
    it('should validate delivery fee ranges', () => {
      const highFee = Money.create(50000, 'TZS'); // 50k TZS
      const lowFee = Money.create(500, 'TZS'); // 500 TZS

      expect(highFee.isValidDeliveryFee()).toBe(false); // Too high
      expect(lowFee.isValidDeliveryFee()).toBe(true); // Valid
    });

    it('should calculate earnings share', () => {
      const deliveryFee = Money.create(2000, 'TZS');
      const earnings = deliveryFee.calculateEarnings(0.7); // 70% to courier

      expect(earnings.getAmount()).toBe(1400);
    });
  });
});
