/**
 * Pricing Engine Tests
 * Tests for domain business engines with pure computation and deterministic results
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PricingEngine, CompetitivePricingStrategy, CostPlusPricingStrategy } from '../../engines/pricing-engine';
import { Price } from '../../value-objects/monetary.value-object';
import { ProductType } from '../../value-objects/product-types.value-object';

describe('PricingEngine', () => {
  let engine: PricingEngine;
  let baseContext: any;

  beforeEach(() => {
    engine = new PricingEngine();
    baseContext = {
      productType: ProductType.PHYSICAL,
      demandLevel: 'medium' as const,
      seasonalityFactor: 1.0,
      sellerReputation: 4,
      productCondition: 'new' as const
    };
  });

  describe('Product Price Calculation', () => {
    it('should calculate price with market data', () => {
      const context = {
        ...baseContext,
        marketPrice: 100,
        competitorPrices: [95, 98, 102]
      };

      const result = engine.calculateProductPrice(context);
      expect(result).toBeInstanceOf(Price);
      expect(result.toNumber()).toBeGreaterThan(0);
    });

    it('should calculate price with cost data (fallback)', () => {
      const context = {
        ...baseContext,
        baseCost: 60
      };

      const result = engine.calculateProductPrice(context);
      expect(result).toBeInstanceOf(Price);
      expect(result.toNumber()).toBeGreaterThan(60); // Should include markup
    });

    it('should throw error when no pricing data available', () => {
      const context = { ...baseContext };

      expect(() => engine.calculateProductPrice(context)).toThrow();
    });

    it('should handle high demand pricing', () => {
      const context = {
        ...baseContext,
        marketPrice: 100,
        demandLevel: 'high' as const
      };

      const result = engine.calculateProductPrice(context);
      expect(result.toNumber()).toBeGreaterThan(100); // High demand premium
    });

    it('should handle low demand pricing', () => {
      const context = {
        ...baseContext,
        marketPrice: 100,
        demandLevel: 'low' as const
      };

      const result = engine.calculateProductPrice(context);
      expect(result.toNumber()).toBeLessThan(100); // Low demand discount
    });
  });

  describe('Wholesale Pricing', () => {
    it('should calculate wholesale pricing for high demand', () => {
      const basePrice = new Price(100);
      const context = {
        ...baseContext,
        demandLevel: 'high' as const
      };

      const result = engine.calculateWholesalePricing(basePrice, context);
      expect(result).toBeDefined();
      expect(result.getUnitPrice()).toBeInstanceOf(Price);
      expect(result.getBulkTiers()).toHaveLength(3); // High demand has 3 tiers
    });

    it('should calculate wholesale pricing for normal demand', () => {
      const basePrice = new Price(100);
      const context = { ...baseContext };

      const result = engine.calculateWholesalePricing(basePrice, context);
      expect(result).toBeDefined();
      expect(result.getBulkTiers()).toHaveLength(3);
    });

    it('should calculate total price for quantity', () => {
      const basePrice = new Price(100);
      const context = { ...baseContext };
      const wholesalePricing = engine.calculateWholesalePricing(basePrice, context);

      const totalPrice = wholesalePricing.calculatePrice(50);
      expect(totalPrice).toBeInstanceOf(Price);
      expect(totalPrice.toNumber()).toBeGreaterThan(0);
    });
  });

  describe('Pricing Strategy Analysis', () => {
    it('should recommend competitive strategy with market data', () => {
      const context = {
        ...baseContext,
        marketPrice: 100,
        competitorPrices: [95, 98, 102, 97]
      };

      const analysis = engine.analyzePricingStrategy(context);
      expect(analysis.recommendedStrategy).toBe('competitive');
      expect(analysis.optimalPrice).toBeInstanceOf(Price);
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.reasoning).toHaveLength(1);
    });

    it('should recommend cost-plus strategy with cost data only', () => {
      const context = {
        ...baseContext,
        baseCost: 60
      };

      const analysis = engine.analyzePricingStrategy(context);
      expect(analysis.recommendedStrategy).toBe('cost_plus');
      expect(analysis.optimalPrice).toBeInstanceOf(Price);
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    it('should recommend dynamic pricing when insufficient data', () => {
      const context = { ...baseContext };

      const analysis = engine.analyzePricingStrategy(context);
      expect(analysis.recommendedStrategy).toBe('dynamic');
      expect(analysis.confidence).toBeLessThan(0.8);
    });
  });

  describe('Pricing Constraints Validation', () => {
    it('should validate pricing constraints successfully', () => {
      const price = new Price(100);
      const context = {
        ...baseContext,
        baseCost: 60,
        marketPrice: 120
      };

      const validation = engine.validatePricingConstraints(price, context);
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should detect price too low', () => {
      const price = new Price(20); // Below 50% of base cost
      const context = {
        ...baseContext,
        baseCost: 60
      };

      const validation = engine.validatePricingConstraints(price, context);
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('Price too low - below 50% of cost');
      expect(validation.suggestions).toContain('Consider increasing price to maintain healthy margins');
    });

    it('should handle price above market with suggestions', () => {
      const price = new Price(180); // Above market
      const context = {
        ...baseContext,
        marketPrice: 120
      };

      const validation = engine.validatePricingConstraints(price, context);
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.violations)).toBe(true);
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });

    it('should handle competitor analysis', () => {
      const price = new Price(110);
      const context = {
        ...baseContext,
        competitorPrices: [90, 95, 100, 105]
      };

      const validation = engine.validatePricingConstraints(price, context);
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.violations)).toBe(true);
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });
  });

  describe('Strategy Comparison', () => {
    it('should compare competitive vs cost-plus strategies', () => {
      const competitiveStrategy = new CompetitivePricingStrategy();
      const costPlusStrategy = new CostPlusPricingStrategy();

      const context = {
        ...baseContext,
        marketPrice: 100,
        competitorPrices: [95, 98, 102],
        baseCost: 60
      };

      const competitivePrice = competitiveStrategy.calculateOptimalPrice(context);
      const costPlusPrice = costPlusStrategy.calculateOptimalPrice(context);

      expect(competitivePrice).toBeInstanceOf(Price);
      expect(costPlusPrice).toBeInstanceOf(Price);
      expect(competitivePrice.toNumber()).not.toBe(costPlusPrice.toNumber());
    });

    it('should handle different markup percentages in cost-plus', () => {
      const lowMarkup = new CostPlusPricingStrategy(25); // 25% markup
      const highMarkup = new CostPlusPricingStrategy(75); // 75% markup

      const context = {
        ...baseContext,
        baseCost: 80
      };

      const lowPrice = lowMarkup.calculateOptimalPrice(context);
      const highPrice = highMarkup.calculateOptimalPrice(context);

      expect(lowPrice.toNumber()).toBeLessThan(highPrice.toNumber());
      expect(lowPrice.toNumber()).toBe(100); // 80 * 1.25
      expect(highPrice.toNumber()).toBe(140); // 80 * 1.75
    });
  });

  describe('Engine Consistency', () => {
    it('should produce consistent results across calls', () => {
      const context = {
        ...baseContext,
        marketPrice: 100,
        competitorPrices: [95, 98, 102]
      };

      const result1 = engine.calculateProductPrice(context);
      const result2 = engine.calculateProductPrice(context);
      const result3 = engine.calculateProductPrice(context);

      expect(result1.toNumber()).toBe(result2.toNumber());
      expect(result2.toNumber()).toBe(result3.toNumber());
    });

    it('should handle multiple contexts independently', () => {
      const context1 = { ...baseContext, marketPrice: 100 };
      const context2 = { ...baseContext, marketPrice: 200 };

      const result1 = engine.calculateProductPrice(context1);
      const result2 = engine.calculateProductPrice(context2);

      expect(result1.toNumber()).not.toBe(result2.toNumber());
      expect(result1.toNumber()).toBeLessThan(result2.toNumber());
    });
  });
});
