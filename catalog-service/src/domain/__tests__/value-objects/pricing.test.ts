/**
 * Pricing Value Object Tests
 * Tests for domain value objects with pure logic and edge case coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Price, WholesaleTier, WholesalePricing, CostPrice } from '../../value-objects/monetary.value-object';

describe('Price Value Object', () => {
  describe('Creation', () => {
    it('should create valid price', () => {
      const price = new Price(99.99, 'USD');
      expect(price.toNumber()).toBe(99.99);
      expect(price.getCurrency()).toBe('USD');
    });

    it('should create price with default currency', () => {
      const price = new Price(50.00);
      expect(price.getCurrency()).toBe('USD');
    });

    it('should reject negative price', () => {
      expect(() => new Price(-10.00)).toThrow('Price cannot be negative');
    });

    it('should accept large amounts within limits', () => {
      const price = new Price(2000000);
      expect(price.toNumber()).toBe(2000000);
    });

    it('should handle zero price', () => {
      const price = new Price(0);
      expect(price.toNumber()).toBe(0);
    });

    it('should handle decimal precision', () => {
      const price = new Price(99.999);
      expect(price.toNumber()).toBe(99.999);
    });
  });

  describe('Operations', () => {
    let price1: Price;
    let price2: Price;

    beforeEach(() => {
      price1 = new Price(100.00, 'USD');
      price2 = new Price(50.00, 'USD');
    });

    it('should add prices with same currency', () => {
      const result = price1.add(price2);
      expect(result.toNumber()).toBe(150.00);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should reject adding prices with different currencies', () => {
      const eurPrice = new Price(50.00, 'EUR');
      expect(() => price1.add(eurPrice)).toThrow('Cannot add prices with different currencies');
    });

    it('should multiply price by factor', () => {
      const result = price1.multiply(1.1);
      expect(result.toNumber()).toBeCloseTo(110.00, 2);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should reject negative multiplication factor', () => {
      expect(() => price1.multiply(-1)).toThrow('Multiplication factor cannot be negative');
    });

    it('should handle zero multiplication factor', () => {
      const result = price1.multiply(0);
      expect(result.toNumber()).toBe(0);
    });

    it('should handle large multiplication factors', () => {
      const result = price1.multiply(1000);
      expect(result.toNumber()).toBe(100000);
    });
  });

  describe('Equality', () => {
    it('should be equal for same amount and currency', () => {
      const price1 = new Price(100.00, 'USD');
      const price2 = new Price(100.00, 'USD');
      expect(price1.equals(price2)).toBe(true);
    });

    it('should not be equal for different amounts', () => {
      const price1 = new Price(100.00, 'USD');
      const price2 = new Price(99.99, 'USD');
      expect(price1.equals(price2)).toBe(false);
    });

    it('should not be equal for different currencies', () => {
      const price1 = new Price(100.00, 'USD');
      const price2 = new Price(100.00, 'EUR');
      expect(price1.equals(price2)).toBe(false);
    });
  });

  describe('String Representation', () => {
    it('should format price correctly', () => {
      const price = new Price(99.99, 'USD');
      expect(price.format()).toBe('USD 99.99');
    });

    it('should handle whole numbers', () => {
      const price = new Price(100, 'USD');
      expect(price.format()).toBe('USD 100.00');
    });

    it('should handle different currencies', () => {
      const price = new Price(50.50, 'EUR');
      expect(price.format()).toBe('EUR 50.50');
    });
  });

  describe('Immutability', () => {
    it('should return new instance for operations', () => {
      const price1 = new Price(100.00, 'USD');
      const price2 = new Price(50.00, 'USD');

      const result = price1.add(price2);

      expect(result).not.toBe(price1);
      expect(result).not.toBe(price2);
      expect(price1.toNumber()).toBe(100.00);
      expect(price2.toNumber()).toBe(50.00);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small decimal amounts', () => {
      const price = new Price(0.01);
      expect(price.toNumber()).toBe(0.01);
    });

    it('should handle very large amounts within limit', () => {
      const price = new Price(999999.99);
      expect(price.toNumber()).toBe(999999.99);
    });

    it('should handle floating point precision', () => {
      const price1 = new Price(10.1);
      const price2 = new Price(20.2);
      const result = price1.add(price2);
      expect(result.toNumber()).toBeCloseTo(30.3, 1);
    });
  });
});

describe('WholesaleTier Value Object', () => {
  describe('Creation', () => {
    it('should create valid wholesale tier', () => {
      const tier = new WholesaleTier(10, 10); // minQuantity, discountPercentage
      expect(tier.getMinQuantity()).toBe(10);
      expect(tier.getDiscountPercentage()).toBe(10);
    });

    it('should reject negative minimum quantity', () => {
      expect(() => new WholesaleTier(-1, 10)).toThrow('Minimum quantity must be at least 1');
    });

    it('should reject discount percentage below 0', () => {
      expect(() => new WholesaleTier(10, -5)).toThrow('Discount percentage must be between 0 and 100');
    });

    it('should reject discount percentage above 100', () => {
      expect(() => new WholesaleTier(10, 150)).toThrow('Discount percentage must be between 0 and 100');
    });

    it('should handle zero discount', () => {
      const tier = new WholesaleTier(5, 0);
      expect(tier.getDiscountPercentage()).toBe(0);
    });

    it('should handle maximum discount', () => {
      const tier = new WholesaleTier(1, 100);
      expect(tier.getDiscountPercentage()).toBe(100);
    });
  });

  describe('Price Calculation', () => {
    let basePrice: Price;
    let tier: WholesaleTier;

    beforeEach(() => {
      basePrice = new Price(100.00, 'USD');
      tier = new WholesaleTier(10, 10); // 10% discount for min quantity 10
    });

    it('should calculate discounted price', () => {
      const result = tier.applyTo(basePrice);
      expect(result.toNumber()).toBe(90.00); // 10% discount
      expect(result.getCurrency()).toBe('USD');
    });

    it('should handle large discounts', () => {
      const largeDiscountTier = new WholesaleTier(5, 50);
      const result = largeDiscountTier.applyTo(basePrice);
      expect(result.toNumber()).toBe(50.00);
    });

    it('should handle small discounts', () => {
      const smallDiscountTier = new WholesaleTier(1, 1);
      const result = smallDiscountTier.applyTo(basePrice);
      expect(result.toNumber()).toBe(99.00);
    });

    it('should handle different currencies', () => {
      const eurPrice = new Price(100.00, 'EUR');
      const result = tier.applyTo(eurPrice);
      expect(result.getCurrency()).toBe('EUR');
      expect(result.toNumber()).toBe(90.00);
    });
  });

  describe('Applicability', () => {
    it('should be applicable for quantity at minimum', () => {
      const tier = new WholesaleTier(10, 10);
      expect(tier.isApplicable(10)).toBe(true);
    });

    it('should be applicable for quantity above minimum', () => {
      const tier = new WholesaleTier(10, 10);
      expect(tier.isApplicable(15)).toBe(true);
    });

    it('should not be applicable for quantity below minimum', () => {
      const tier = new WholesaleTier(10, 10);
      expect(tier.isApplicable(5)).toBe(false);
    });

    it('should always be applicable for minimum quantity of 1', () => {
      const tier = new WholesaleTier(1, 5);
      expect(tier.isApplicable(1)).toBe(true);
      expect(tier.isApplicable(1000)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large minimum quantities', () => {
      const tier = new WholesaleTier(10000, 20);
      expect(tier.isApplicable(9999)).toBe(false);
      expect(tier.isApplicable(10000)).toBe(true);
    });

    it('should handle very small discounts', () => {
      const tier = new WholesaleTier(5, 0.01);
      const basePrice = new Price(10000.00);
      const result = tier.applyTo(basePrice);
      expect(result.toNumber()).toBeCloseTo(9999.00, 2);
    });

    it('should handle maximum discount (100%)', () => {
      const tier = new WholesaleTier(1, 100);
      const basePrice = new Price(500.00);
      const result = tier.applyTo(basePrice);
      expect(result.toNumber()).toBe(0);
    });
  });
});

describe('Pricing Value Objects Integration', () => {
  it('should handle complex pricing scenarios with WholesalePricing', () => {
    // Setup
    const unitPrice = new Price(100.00, 'USD');
    const smallTier = new WholesaleTier(10, 5); // 5% discount for 10+ quantity
    const bulkTier = new WholesaleTier(50, 20); // 20% discount for 50+ quantity

    const wholesalePricing = new WholesalePricing(unitPrice, [smallTier, bulkTier]);

    // Calculate prices for different quantities
    const singlePrice = wholesalePricing.calculatePrice(1); // Should use unit price
    const smallBulkPrice = wholesalePricing.calculatePrice(10); // Should use small discount (10 × $95)
    const largeBulkPrice = wholesalePricing.calculatePrice(50); // Should use large discount (50 × $80)

    // Verify calculations
    expect(singlePrice.toNumber()).toBe(100.00); // No discount
    expect(smallBulkPrice.toNumber()).toBe(950.00); // 10 × $95 = $950
    expect(largeBulkPrice.toNumber()).toBe(4000.00); // 50 × $80 = $4000

    // Test tier retrieval
    expect(wholesalePricing.getBestTier(1)).toBeNull(); // No tier applies
    expect(wholesalePricing.getBestTier(10)).toBe(smallTier);
    expect(wholesalePricing.getBestTier(50)).toBe(bulkTier);

    // Test price operations - multiply unit price for comparison
    const totalBulk = unitPrice.multiply(10);
    expect(totalBulk.toNumber()).toBe(1000.00);

    const markup = unitPrice.multiply(1.25); // 25% markup
    expect(markup.toNumber()).toBe(125.00);
  });

  it('should maintain immutability across operations', () => {
    const originalPrice = new Price(100.00, 'USD');
    const tier = new WholesaleTier(1, 10); // 10% discount

    // Perform multiple operations
    const discounted = tier.applyTo(originalPrice);
    const doubled = discounted.multiply(2);
    const final = doubled.add(new Price(10.00, 'USD'));

    // Original should remain unchanged
    expect(originalPrice.toNumber()).toBe(100.00);
    expect(discounted.toNumber()).toBe(90.00);
    expect(doubled.toNumber()).toBe(180.00);
    expect(final.toNumber()).toBe(190.00);
  });
});

describe('CostPrice Value Object', () => {
  describe('Creation', () => {
    it('should create valid cost price', () => {
      const costPrice = new CostPrice(50.00);
      expect(costPrice.toNumber()).toBe(50.00);
    });

    it('should reject negative cost price', () => {
      expect(() => new CostPrice(-10.00)).toThrow('Cost price cannot be negative');
    });

    it('should handle zero cost price', () => {
      const costPrice = new CostPrice(0);
      expect(costPrice.toNumber()).toBe(0);
    });
  });

  describe('Margin and Markup Calculations', () => {
    let costPrice: CostPrice;
    let sellingPrice: Price;

    beforeEach(() => {
      costPrice = new CostPrice(50.00);
      sellingPrice = new Price(75.00, 'USD');
    });

    it('should calculate profit margin', () => {
      const margin = costPrice.calculateMargin(sellingPrice);
      expect(margin).toBe(50.00); // (75-50)/50 * 100 = 50%
    });

    it('should calculate markup', () => {
      const markup = costPrice.calculateMarkup(sellingPrice);
      expect(markup).toBe(50.00); // (75-50)/50 * 100 = 50%
    });

    it('should identify profitable pricing', () => {
      expect(costPrice.isProfitable(sellingPrice)).toBe(true);

      const lossPrice = new Price(25.00, 'USD');
      expect(costPrice.isProfitable(lossPrice)).toBe(false);
    });

    it('should handle break-even pricing', () => {
      const breakEvenPrice = new Price(50.00, 'USD');
      expect(costPrice.isProfitable(breakEvenPrice)).toBe(false);
    });
  });
});
