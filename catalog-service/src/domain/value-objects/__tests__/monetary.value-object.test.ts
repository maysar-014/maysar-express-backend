/**
 * Monetary Value Objects Tests
 * 
 * Purpose: Validates monetary value objects for pricing and cost calculations
 * Scope: Domain layer testing with zero external dependencies
 * Coverage Target: 98% (critical business logic)
 * 
 * Test Categories:
 * - Price validation and operations
 * - Cost price calculations
 * - Wholesale pricing logic
 * - Currency handling
 * - Edge cases and error conditions
 */

import { Price, CostPrice, WholesaleTier, WholesalePricing } from '../monetary.value-object';

describe('Price', () => {
  describe('Creation and Validation', () => {
    it('should create valid price', () => {
      // Given: Valid price data
      const price = new Price(99.99, 'USD');

      // Then: Price should be created successfully
      expect(price.toNumber()).toBe(99.99);
      expect(price.getCurrency()).toBe('USD');
    });

    it('should reject negative price', () => {
      // When/Then: Creating negative price should throw error
      expect(() => new Price(-10, 'USD')).toThrow('Price cannot be negative');
    });

    it('should reject non-finite price', () => {
      // When/Then: Creating non-finite price should throw error
      expect(() => new Price(Infinity, 'USD')).toThrow('Price must be a finite number');
      expect(() => new Price(NaN, 'USD')).toThrow('Price must be a finite number');
    });

    it('should reject invalid currency code', () => {
      // When/Then: Creating price with invalid currency should throw error
      expect(() => new Price(99.99, 'US')).toThrow('Currency must be a 3-letter code');
      expect(() => new Price(99.99, 'USDD')).toThrow('Currency must be a 3-letter code');
      expect(() => new Price(99.99, '')).toThrow('Currency must be a 3-letter code');
    });

    it('should default to USD currency', () => {
      // Given: Price without currency
      const price = new Price(99.99);

      // Then: Should default to USD
      expect(price.getCurrency()).toBe('USD');
    });
  });

  describe('Arithmetic Operations', () => {
    let price1: Price;
    let price2: Price;

    beforeEach(() => {
      price1 = new Price(100, 'USD');
      price2 = new Price(50, 'USD');
    });

    it('should add prices with same currency', () => {
      // When: Adding prices
      const result = price1.add(price2);

      // Then: Result should be correct
      expect(result.toNumber()).toBe(150);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should reject adding prices with different currencies', () => {
      // Given: Price with different currency
      const priceGBP = new Price(50, 'GBP');

      // When/Then: Adding prices with different currencies should throw error
      expect(() => price1.add(priceGBP)).toThrow('Cannot add prices with different currencies');
    });

    it('should subtract prices with same currency', () => {
      // When: Subtracting prices
      const result = price1.subtract(price2);

      // Then: Result should be correct
      expect(result.toNumber()).toBe(50);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should reject subtracting prices with different currencies', () => {
      // Given: Price with different currency
      const priceGBP = new Price(50, 'GBP');

      // When/Then: Subtracting prices with different currencies should throw error
      expect(() => price1.subtract(priceGBP)).toThrow('Cannot subtract prices with different currencies');
    });

    it('should reject subtraction that results in negative price', () => {
      // When/Then: Subtracting larger price should throw error
      expect(() => price2.subtract(price1)).toThrow('Cannot subtract: result would be negative');
    });

    it('should multiply price by factor', () => {
      // When: Multiplying price
      const result = price1.multiply(2);

      // Then: Result should be correct
      expect(result.toNumber()).toBe(200);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should reject negative multiplication factor', () => {
      // When/Then: Multiplying by negative factor should throw error
      expect(() => price1.multiply(-1)).toThrow('Multiplication factor cannot be negative');
    });

    it('should divide price by divisor', () => {
      // When: Dividing price
      const result = price1.divide(2);

      // Then: Result should be correct
      expect(result.toNumber()).toBe(50);
      expect(result.getCurrency()).toBe('USD');
    });

    it('should reject zero divisor', () => {
      // When/Then: Dividing by zero should throw error
      expect(() => price1.divide(0)).toThrow('Divisor must be positive');
    });

    it('should reject negative divisor', () => {
      // When/Then: Dividing by negative number should throw error
      expect(() => price1.divide(-1)).toThrow('Divisor must be positive');
    });
  });

  describe('Comparison Operations', () => {
    let price1: Price;
    let price2: Price;
    let price3: Price;

    beforeEach(() => {
      price1 = new Price(100, 'USD');
      price2 = new Price(50, 'USD');
      price3 = new Price(100, 'USD');
    });

    it('should compare prices with same currency', () => {
      // Then: Comparisons should work correctly
      expect(price1.isGreaterThan(price2)).toBe(true);
      expect(price2.isLessThan(price1)).toBe(true);
      expect(price1.equals(price3)).toBe(true);
    });

    it('should reject comparing prices with different currencies', () => {
      // Given: Price with different currency
      const priceGBP = new Price(100, 'GBP');

      // When/Then: Comparing prices with different currencies should throw error
      expect(() => price1.isGreaterThan(priceGBP)).toThrow('Cannot compare prices with different currencies');
      expect(() => price1.isLessThan(priceGBP)).toThrow('Cannot compare prices with different currencies');
    });

    it('should format price correctly', () => {
      // Given: Price with decimal
      const price = new Price(99.99, 'USD');

      // When: Formatting price
      const formatted = price.format();

      // Then: Should format correctly
      expect(formatted).toBe('USD 99.99');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero price', () => {
      // Given: Zero price
      const price = new Price(0, 'USD');

      // Then: Should be valid
      expect(price.toNumber()).toBe(0);
      expect(price.getCurrency()).toBe('USD');
    });

    it('should handle very large prices', () => {
      // Given: Very large price
      const price = new Price(999999.99, 'USD');

      // Then: Should be valid
      expect(price.toNumber()).toBe(999999.99);
    });

    it('should handle fractional prices', () => {
      // Given: Fractional price
      const price = new Price(99.995, 'USD');

      // Then: Should handle fractional part
      expect(price.toNumber()).toBe(99.995);
    });

    it('should handle different currency codes', () => {
      // Given: Prices with different valid currencies
      const usdPrice = new Price(100, 'USD');
      const eurPrice = new Price(100, 'EUR');
      const gbpPrice = new Price(100, 'GBP');

      // Then: All should be valid
      expect(usdPrice.getCurrency()).toBe('USD');
      expect(eurPrice.getCurrency()).toBe('EUR');
      expect(gbpPrice.getCurrency()).toBe('GBP');
    });
  });
});

describe('CostPrice', () => {
  describe('Creation and Validation', () => {
    it('should create valid cost price', () => {
      // Given: Valid cost price
      const costPrice = new CostPrice(70);

      // Then: Should be created successfully
      expect(costPrice.toNumber()).toBe(70);
    });

    it('should reject negative cost price', () => {
      // When/Then: Creating negative cost price should throw error
      expect(() => new CostPrice(-10)).toThrow('Cost price cannot be negative');
    });

    it('should reject non-finite cost price', () => {
      // When/Then: Creating non-finite cost price should throw error
      expect(() => new CostPrice(Infinity)).toThrow('Cost price must be a finite number');
      expect(() => new CostPrice(NaN)).toThrow('Cost price must be a finite number');
    });
  });

  describe('Margin and Markup Calculations', () => {
    let costPrice: CostPrice;
    let sellingPrice: Price;

    beforeEach(() => {
      costPrice = new CostPrice(70);
      sellingPrice = new Price(100, 'USD');
    });

    it('should calculate margin correctly', () => {
      // When: Calculating margin
      const margin = costPrice.calculateMargin(sellingPrice);

      // Then: Margin should be correct (30%)
      expect(margin).toBe(42.86); // ((100 - 70) / 70) * 100 = 42.86%
    });

    it('should calculate markup correctly', () => {
      // When: Calculating markup
      const markup = costPrice.calculateMarkup(sellingPrice);

      // Then: Markup should be correct (30%)
      expect(markup).toBe(42.86); // ((100 - 70) / 70) * 100 = 42.86%
    });

    it('should determine profitability', () => {
      // Given: Profitable and non-profitable scenarios
      const profitablePrice = new Price(100, 'USD');
      const nonProfitablePrice = new Price(50, 'USD');

      // When: Checking profitability
      const isProfitable = costPrice.isProfitable(profitablePrice);
      const isNotProfitable = costPrice.isProfitable(nonProfitablePrice);

      // Then: Should determine correctly
      expect(isProfitable).toBe(true);
      expect(isNotProfitable).toBe(false);
    });

    it('should handle zero selling price', () => {
      // Given: Zero selling price
      const zeroPrice = new Price(0, 'USD');

      // When: Calculating margin
      const margin = costPrice.calculateMargin(zeroPrice);

      // Then: Should handle zero case
      expect(margin).toBe(-100); // ((0 - 70) / 70) * 100 = -100%
    });

    it('should handle equal cost and selling price', () => {
      // Given: Equal cost and selling price
      const equalPrice = new Price(70, 'USD');

      // When: Calculating margin
      const margin = costPrice.calculateMargin(equalPrice);

      // Then: Should be zero margin
      expect(margin).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero cost price', () => {
      // Given: Zero cost price
      const zeroCostPrice = new CostPrice(0);

      // When: Calculating margin with positive selling price
      const margin = zeroCostPrice.calculateMargin(new Price(100, 'USD'));

      // Then: Should handle zero cost (infinite margin)
      expect(margin).toBe(Infinity);
    });

    it('should handle very small cost price', () => {
      // Given: Very small cost price
      const smallCostPrice = new CostPrice(0.01);

      // When: Calculating margin
      const margin = smallCostPrice.calculateMargin(new Price(1, 'USD'));

      // Then: Should calculate correctly
      expect(margin).toBe(9900); // ((1 - 0.01) / 0.01) * 100 = 9900%
    });
  });
});

describe('WholesaleTier', () => {
  describe('Creation and Validation', () => {
    it('should create valid wholesale tier', () => {
      // Given: Valid tier data
      const tier = new WholesaleTier(10, 10);

      // Then: Should be created successfully
      expect(tier.getMinQuantity()).toBe(10);
      expect(tier.getDiscountPercentage()).toBe(10);
    });

    it('should reject zero minimum quantity', () => {
      // When/Then: Creating tier with zero minimum quantity should throw error
      expect(() => new WholesaleTier(0, 10)).toThrow('Minimum quantity must be at least 1');
    });

    it('should reject negative minimum quantity', () => {
      // When/Then: Creating tier with negative minimum quantity should throw error
      expect(() => new WholesaleTier(-1, 10)).toThrow('Minimum quantity must be at least 1');
    });

    it('should reject negative discount percentage', () => {
      // When/Then: Creating tier with negative discount should throw error
      expect(() => new WholesaleTier(10, -1)).toThrow('Discount percentage must be between 0 and 100');
    });

    it('should reject discount percentage over 100%', () => {
      // When/Then: Creating tier with over 100% discount should throw error
      expect(() => new WholesaleTier(10, 101)).toThrow('Discount percentage must be between 0 and 100');
    });

    it('should accept 100% discount', () => {
      // When: Creating tier with 100% discount
      const tier = new WholesaleTier(10, 100);

      // Then: Should be valid
      expect(tier.getDiscountPercentage()).toBe(100);
    });
  });

  describe('Discount Application', () => {
    let tier: WholesaleTier;
    let basePrice: Price;

    beforeEach(() => {
      tier = new WholesaleTier(10, 20);
      basePrice = new Price(100, 'USD');
    });

    it('should apply discount to base price', () => {
      // When: Applying discount
      const discountedPrice = tier.applyTo(basePrice);

      // Then: Should apply 20% discount
      expect(discountedPrice.toNumber()).toBe(80); // 100 * 0.8 = 80
      expect(discountedPrice.getCurrency()).toBe('USD');
    });

    it('should determine if tier is applicable', () => {
      // Given: Different quantities
      const smallQuantity = 5;
      const largeQuantity = 15;

      // When: Checking applicability
      const isSmallApplicable = tier.isApplicable(smallQuantity);
      const isLargeApplicable = tier.isApplicable(largeQuantity);

      // Then: Should determine correctly
      expect(isSmallApplicable).toBe(false);
      expect(isLargeApplicable).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% discount', () => {
      // Given: 0% discount tier
      const tier = new WholesaleTier(10, 0);
      const basePrice = new Price(100, 'USD');

      // When: Applying discount
      const discountedPrice = tier.applyTo(basePrice);

      // Then: Should not change price
      expect(discountedPrice.toNumber()).toBe(100);
    });

    it('should handle 100% discount', () => {
      // Given: 100% discount tier
      const tier = new WholesaleTier(10, 100);
      const basePrice = new Price(100, 'USD');

      // When: Applying discount
      const discountedPrice = tier.applyTo(basePrice);

      // Then: Should make price zero
      expect(discountedPrice.toNumber()).toBe(0);
    });
  });
});

describe('WholesalePricing', () => {
  describe('Creation and Validation', () => {
    it('should create valid wholesale pricing', () => {
      // Given: Valid wholesale pricing data
      const unitPrice = new Price(100, 'USD');
      const tiers = [
        new WholesaleTier(10, 10),
        new WholesaleTier(50, 20)
      ];

      // When: Creating wholesale pricing
      const wholesalePricing = new WholesalePricing(unitPrice, tiers);

      // Then: Should be created successfully
      expect(wholesalePricing.getUnitPrice().toNumber()).toBe(100);
      expect(wholesalePricing.getBulkTiers()).toHaveLength(2);
    });

    it('should create wholesale pricing without tiers', () => {
      // Given: Unit price without tiers
      const unitPrice = new Price(100, 'USD');

      // When: Creating wholesale pricing
      const wholesalePricing = new WholesalePricing(unitPrice);

      // Then: Should be created successfully
      expect(wholesalePricing.getUnitPrice().toNumber()).toBe(100);
      expect(wholesalePricing.getBulkTiers()).toHaveLength(0);
    });

    it('should reject tiers with non-ascending minimum quantities', () => {
      // Given: Tiers with non-ascending quantities
      const unitPrice = new Price(100, 'USD');
      const invalidTiers = [
        new WholesaleTier(50, 20),
        new WholesaleTier(10, 10) // Smaller quantity after larger
      ];

      // When/Then: Creating wholesale pricing should throw error
      expect(() => new WholesalePricing(unitPrice, invalidTiers)).toThrow('Bulk tiers must have increasing minimum quantities');
    });
  });

  describe('Price Calculation', () => {
    let wholesalePricing: WholesalePricing;
    let unitPrice: Price;

    beforeEach(() => {
      unitPrice = new Price(100, 'USD');
      const tiers = [
        new WholesaleTier(10, 10), // 10% discount for 10+ units
        new WholesaleTier(50, 20)  // 20% discount for 50+ units
      ];
      wholesalePricing = new WholesalePricing(unitPrice, tiers);
    });

    it('should calculate price for single unit', () => {
      // When: Calculating price for single unit
      const price = wholesalePricing.calculatePrice(1);

      // Then: Should return unit price
      expect(price.toNumber()).toBe(100);
    });

    it('should calculate price for quantity in first tier', () => {
      // When: Calculating price for quantity in first tier
      const price = wholesalePricing.calculatePrice(15);

      // Then: Should apply 10% discount
      expect(price.toNumber()).toBe(1350); // 15 * 100 * 0.9 = 1350
    });

    it('should calculate price for quantity in second tier', () => {
      // When: Calculating price for quantity in second tier
      const price = wholesalePricing.calculatePrice(60);

      // Then: Should apply 20% discount
      expect(price.toNumber()).toBe(4800); // 60 * 100 * 0.8 = 4800
    });

    it('should calculate price for boundary quantities', () => {
      // Given: Boundary quantities
      const boundaryQuantities = [9, 10, 49, 50];

      // When: Calculating prices
      const prices = boundaryQuantities.map(q => wholesalePricing.calculatePrice(q));

      // Then: Should apply correct discounts
      expect(prices[0].toNumber()).toBe(900);  // 9 * 100 = 900 (no discount)
      expect(prices[1].toNumber()).toBe(900);  // 10 * 100 * 0.9 = 900 (10% discount)
      expect(prices[2].toNumber()).toBe(4410); // 49 * 100 * 0.9 = 4410 (10% discount)
      expect(prices[3].toNumber()).toBe(4000); // 50 * 100 * 0.8 = 4000 (20% discount)
    });

    it('should reject zero quantity', () => {
      // When/Then: Calculating price for zero quantity should throw error
      expect(() => wholesalePricing.calculatePrice(0)).toThrow('Quantity must be positive');
    });

    it('should reject negative quantity', () => {
      // When/Then: Calculating price for negative quantity should throw error
      expect(() => wholesalePricing.calculatePrice(-1)).toThrow('Quantity must be positive');
    });
  });

  describe('Best Tier Selection', () => {
    let wholesalePricing: WholesalePricing;

    beforeEach(() => {
      const unitPrice = new Price(100, 'USD');
      const tiers = [
        new WholesaleTier(10, 10),
        new WholesaleTier(50, 20)
      ];
      wholesalePricing = new WholesalePricing(unitPrice, tiers);
    });

    it('should return null for quantity below minimum tier', () => {
      // When: Getting best tier for small quantity
      const bestTier = wholesalePricing.getBestTier(5);

      // Then: Should return null
      expect(bestTier).toBeNull();
    });

    it('should return first tier for medium quantity', () => {
      // When: Getting best tier for medium quantity
      const bestTier = wholesalePricing.getBestTier(25);

      // Then: Should return first tier
      expect(bestTier).not.toBeNull();
      expect(bestTier?.getMinQuantity()).toBe(10);
      expect(bestTier?.getDiscountPercentage()).toBe(10);
    });

    it('should return second tier for large quantity', () => {
      // When: Getting best tier for large quantity
      const bestTier = wholesalePricing.getBestTier(100);

      // Then: Should return second tier
      expect(bestTier).not.toBeNull();
      expect(bestTier?.getMinQuantity()).toBe(50);
      expect(bestTier?.getDiscountPercentage()).toBe(20);
    });

    it('should return best applicable tier for boundary quantities', () => {
      // Given: Boundary quantities
      const boundaryQuantities = [9, 10, 49, 50];

      // When: Getting best tiers
      const bestTiers = boundaryQuantities.map(q => wholesalePricing.getBestTier(q));

      // Then: Should return correct tiers
      expect(bestTiers[0]).toBeNull(); // Below minimum
      expect(bestTiers[1]?.getMinQuantity()).toBe(10); // First tier
      expect(bestTiers[2]?.getMinQuantity()).toBe(10); // First tier
      expect(bestTiers[3]?.getMinQuantity()).toBe(50); // Second tier
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tier pricing', () => {
      // Given: Single tier
      const unitPrice = new Price(100, 'USD');
      const singleTier = new WholesalePricing(unitPrice, [new WholesaleTier(10, 15)]);

      // When: Calculating prices
      const smallPrice = singleTier.calculatePrice(5);
      const largePrice = singleTier.calculatePrice(20);

      // Then: Should apply single tier correctly
      expect(smallPrice.toNumber()).toBe(500);  // 5 * 100 = 500
      expect(largePrice.toNumber()).toBe(1700); // 20 * 100 * 0.85 = 1700
    });

    it('should handle very large quantities', () => {
      // Given: Very large quantity
      const unitPrice = new Price(100, 'USD');
      const tiers = [new WholesaleTier(1000, 30)];
      const wholesalePricing = new WholesalePricing(unitPrice, tiers);

      // When: Calculating price for very large quantity
      const price = wholesalePricing.calculatePrice(10000);

      // Then: Should handle large numbers correctly
      expect(price.toNumber()).toBe(700000); // 10000 * 100 * 0.7 = 700000
    });

    it('should handle fractional unit prices', () => {
      // Given: Fractional unit price
      const unitPrice = new Price(99.99, 'USD');
      const tiers = [new WholesaleTier(10, 10)];
      const wholesalePricing = new WholesalePricing(unitPrice, tiers);

      // When: Calculating price
      const price = wholesalePricing.calculatePrice(15);

      // Then: Should handle fractional prices correctly
      expect(price.toNumber()).toBe(1349.865); // 15 * 99.99 * 0.9 = 1349.865
    });
  });
});