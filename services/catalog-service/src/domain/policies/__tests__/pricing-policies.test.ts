/**
 * Pricing Policies Tests
 * 
 * Purpose: Validates pricing business rules and policies
 * Scope: Domain layer testing with zero external dependencies
 * Coverage Target: 98% (critical business logic)
 * 
 * Test Categories:
 * - Pricing rule engine functionality
 * - Rule evaluation and execution
 * - DSL rule creation
 * - Edge cases and error conditions
 */

import { PricingRuleEngine, PricingPolicyDSL, DEFAULT_PRICING_RULES } from '../pricing-policies';
import { PricingContext, PricingRule, PricingCondition, PricingAction } from '../pricing-policies';

describe('PricingRuleEngine', () => {
  let engine: PricingRuleEngine;

  beforeEach(() => {
    engine = new PricingRuleEngine();
  });

  describe('Rule Management', () => {
    it('should add a new rule', () => {
      // Given: A new pricing rule
      const rule: PricingRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Test adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for pricing engine',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      // When: Adding the rule
      engine.addRule(rule);

      // Then: Rule should be added
      const rules = engine.getAllRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('test_rule');
    });

    it('should update existing rule', () => {
      // Given: An existing rule
      const rule: PricingRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Test adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for pricing engine',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // When: Updating the rule
      const updatedRule: PricingRule = {
        ...rule,
        priority: 10,
        metadata: {
          ...rule.metadata,
          updatedAt: new Date()
        }
      };

      engine.addRule(updatedRule);

      // Then: Rule should be updated
      const rules = engine.getAllRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].priority).toBe(10);
    });

    it('should remove a rule', () => {
      // Given: An existing rule
      const rule: PricingRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Test adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for pricing engine',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // When: Removing the rule
      engine.removeRule('test_rule');

      // Then: Rule should be removed
      const rules = engine.getAllRules();
      expect(rules).toHaveLength(0);
    });

    it('should get a specific rule', () => {
      // Given: An existing rule
      const rule: PricingRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Test adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for pricing engine',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // When: Getting the rule
      const retrievedRule = engine.getRule('test_rule');

      // Then: Rule should be retrieved
      expect(retrievedRule).toBeDefined();
      expect(retrievedRule?.id).toBe('test_rule');
    });

    it('should sort rules by priority', () => {
      // Given: Multiple rules with different priorities
      const rule1: PricingRule = {
        id: 'rule1',
        name: 'Rule 1',
        version: '1.0.0',
        priority: 1,
        condition: { type: 'product_type', operator: 'equals', value: 'physical' },
        action: { type: 'adjust_price', value: 5, unit: 'percentage', reason: 'Test' },
        enabled: true,
        metadata: { description: 'Test', createdAt: new Date(), updatedAt: new Date(), author: 'test' }
      };

      const rule2: PricingRule = {
        id: 'rule2',
        name: 'Rule 2',
        version: '1.0.0',
        priority: 10,
        condition: { type: 'product_type', operator: 'equals', value: 'digital' },
        action: { type: 'adjust_price', value: 15, unit: 'percentage', reason: 'Test' },
        enabled: true,
        metadata: { description: 'Test', createdAt: new Date(), updatedAt: new Date(), author: 'test' }
      };

      // When: Adding rules
      engine.addRule(rule1);
      engine.addRule(rule2);

      // Then: Rules should be sorted by priority (higher first)
      const rules = engine.getAllRules();
      expect(rules[0].priority).toBe(10);
      expect(rules[1].priority).toBe(1);
    });
  });

  describe('Rule Evaluation', () => {
    it('should evaluate simple condition', () => {
      // Given: A rule with simple condition
      const rule: PricingRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Test adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for pricing engine',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context matching the condition
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Rule should be applied
      expect(result.appliedRules).toContain('test_rule');
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].ruleId).toBe('test_rule');
      expect(result.adjustments[0].adjustment).toBe(10); // 10% of 100
      expect(result.finalPrice).toBe(110);
    });

    it('should evaluate complex condition with AND', () => {
      // Given: A rule with complex condition
      const rule: PricingRule = {
        id: 'complex_rule',
        name: 'Complex Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical',
          and: [
            {
              type: 'demand_level',
              operator: 'equals',
              value: 'high'
            }
          ]
        },
        action: {
          type: 'adjust_price',
          value: 20,
          unit: 'percentage',
          reason: 'High demand premium'
        },
        enabled: true,
        metadata: {
          description: 'Complex rule test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context matching both conditions
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'high',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Rule should be applied
      expect(result.appliedRules).toContain('complex_rule');
      expect(result.adjustments[0].adjustment).toBe(20); // 20% of 100
      expect(result.finalPrice).toBe(120);
    });

    it('should evaluate complex condition with OR', () => {
      // Given: A rule with OR condition
      const rule: PricingRule = {
        id: 'or_rule',
        name: 'OR Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'digital',
          or: [
            {
              type: 'product_type',
              operator: 'equals',
              value: 'physical'
            }
          ]
        },
        action: {
          type: 'adjust_price',
          value: 5,
          unit: 'percentage',
          reason: 'Product type adjustment'
        },
        enabled: true,
        metadata: {
          description: 'OR rule test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context matching one of the OR conditions
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Rule should be applied
      expect(result.appliedRules).toContain('or_rule');
      expect(result.adjustments[0].adjustment).toBe(5); // 5% of 100
      expect(result.finalPrice).toBe(105);
    });

    it('should handle disabled rules', () => {
      // Given: A disabled rule
      const rule: PricingRule = {
        id: 'disabled_rule',
        name: 'Disabled Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Test adjustment'
        },
        enabled: false,
        metadata: {
          description: 'Disabled rule test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context that would match the rule
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Disabled rule should not be applied
      expect(result.appliedRules).not.toContain('disabled_rule');
      expect(result.adjustments).toHaveLength(0);
      expect(result.finalPrice).toBe(100);
    });

    it('should handle multiple matching rules', () => {
      // Given: Multiple rules that match
      const rule1: PricingRule = {
        id: 'rule1',
        name: 'Rule 1',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Rule 1 adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Rule 1 test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      const rule2: PricingRule = {
        id: 'rule2',
        name: 'Rule 2',
        version: '1.0.0',
        priority: 3,
        condition: {
          type: 'demand_level',
          operator: 'equals',
          value: 'medium'
        },
        action: {
          type: 'adjust_price',
          value: 5,
          unit: 'percentage',
          reason: 'Rule 2 adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Rule 2 test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule1);
      engine.addRule(rule2);

      // Given: Context matching both rules
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Both rules should be applied
      expect(result.appliedRules).toContain('rule1');
      expect(result.appliedRules).toContain('rule2');
      expect(result.adjustments).toHaveLength(2);
      expect(result.finalPrice).toBe(115); // 100 + 10 + 5
    });
  });

  describe('Action Execution', () => {
    it('should execute percentage adjustment', () => {
      // Given: A rule with percentage adjustment
      const rule: PricingRule = {
        id: 'percentage_rule',
        name: 'Percentage Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 15,
          unit: 'percentage',
          reason: 'Percentage adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Percentage adjustment test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Percentage adjustment should be applied
      expect(result.adjustments[0].adjustment).toBe(15); // 15% of 100
      expect(result.finalPrice).toBe(115);
    });

    it('should execute absolute adjustment', () => {
      // Given: A rule with absolute adjustment
      const rule: PricingRule = {
        id: 'absolute_rule',
        name: 'Absolute Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 25,
          unit: 'absolute',
          reason: 'Absolute adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Absolute adjustment test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Absolute adjustment should be applied
      expect(result.adjustments[0].adjustment).toBe(25);
      expect(result.finalPrice).toBe(125);
    });

    it('should execute multiplier adjustment', () => {
      // Given: A rule with multiplier adjustment
      const rule: PricingRule = {
        id: 'multiplier_rule',
        name: 'Multiplier Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 1.2,
          unit: 'multiplier',
          reason: 'Multiplier adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Multiplier adjustment test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Multiplier adjustment should be applied
      expect(result.adjustments[0].adjustment).toBe(20); // 100 * (1.2 - 1)
      expect(result.finalPrice).toBe(120);
    });

    it('should execute margin setting', () => {
      // Given: A rule with margin setting
      const rule: PricingRule = {
        id: 'margin_rule',
        name: 'Margin Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'set_margin',
          value: 50,
          unit: 'percentage',
          reason: 'Margin adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Margin adjustment test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context with cost price
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Margin should be set to 50%
      expect(result.adjustments[0].adjustment).toBe(35); // 70 * 1.5 - 100 = 105 - 100 = 5
      expect(result.finalPrice).toBe(105);
    });

    it('should execute flag action', () => {
      // Given: A rule with flag action
      const rule: PricingRule = {
        id: 'flag_rule',
        name: 'Flag Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'price_range',
          operator: 'greater_than',
          value: 1000
        },
        action: {
          type: 'flag_for_review',
          value: 0,
          unit: 'absolute',
          reason: 'High value item requires review'
        },
        enabled: true,
        metadata: {
          description: 'Flag action test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context with high price
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 1500,
        costPrice: 1000,
        marketPrice: 1600,
        competitorPrices: [1400, 1550, 1650],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Item should be flagged
      expect(result.flags).toContain('High value item requires review');
      expect(result.finalPrice).toBe(1500); // No price change
    });

    it('should prevent negative prices', () => {
      // Given: A rule that would result in negative price
      const rule: PricingRule = {
        id: 'negative_rule',
        name: 'Negative Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: -150,
          unit: 'percentage',
          reason: 'Large discount'
        },
        enabled: true,
        metadata: {
          description: 'Negative price prevention test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Price should not go negative
      expect(result.finalPrice).toBe(0);
    });
  });

  describe('Default Rules', () => {
    it('should include default pricing rules', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new PricingRuleEngine(DEFAULT_PRICING_RULES);

      // When: Getting all rules
      const rules = engineWithDefaults.getAllRules();

      // Then: Default rules should be present
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.id === 'premium_demand_pricing')).toBe(true);
      expect(rules.some(r => r.id === 'discount_low_demand')).toBe(true);
      expect(rules.some(r => r.id === 'minimum_margin_protection')).toBe(true);
      expect(rules.some(r => r.id === 'high_value_review')).toBe(true);
    });

    it('should apply premium demand pricing rule', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new PricingRuleEngine(DEFAULT_PRICING_RULES);

      // Given: Context with high demand
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'high',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engineWithDefaults.evaluateRules(context);

      // Then: Premium demand rule should be applied
      expect(result.appliedRules).toContain('premium_demand_pricing');
      expect(result.adjustments[0].adjustment).toBe(15); // 15% of 100
      expect(result.finalPrice).toBe(115);
    });

    it('should apply minimum margin protection rule', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new PricingRuleEngine(DEFAULT_PRICING_RULES);

      // Given: Context with low price
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 8,
        costPrice: 7,
        marketPrice: 10,
        competitorPrices: [7.5, 8.5, 9.5],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engineWithDefaults.evaluateRules(context);

      // Then: Minimum margin protection should be applied
      expect(result.appliedRules).toContain('minimum_margin_protection');
      expect(result.finalPrice).toBe(8.4); // 7 * 1.2 = 8.4
    });

    it('should flag high-value items for review', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new PricingRuleEngine(DEFAULT_PRICING_RULES);

      // Given: Context with high-value item
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 1200,
        costPrice: 800,
        marketPrice: 1300,
        competitorPrices: [1100, 1250, 1350],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engineWithDefaults.evaluateRules(context);

      // Then: High-value item should be flagged
      expect(result.flags).toContain('High-value items require manual review');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty rules list', () => {
      // Given: Engine with no rules
      const emptyEngine = new PricingRuleEngine([]);

      // Given: Context
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = emptyEngine.evaluateRules(context);

      // Then: No rules should be applied
      expect(result.appliedRules).toHaveLength(0);
      expect(result.adjustments).toHaveLength(0);
      expect(result.finalPrice).toBe(100);
    });

    it('should handle no matching conditions', () => {
      // Given: Engine with non-matching rules
      const rule: PricingRule = {
        id: 'non_matching_rule',
        name: 'Non-Matching Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'digital'
        },
        action: {
          type: 'adjust_price',
          value: 10,
          unit: 'percentage',
          reason: 'Test adjustment'
        },
        enabled: true,
        metadata: {
          description: 'Non-matching rule test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context that doesn't match
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: No rules should be applied
      expect(result.appliedRules).toHaveLength(0);
      expect(result.adjustments).toHaveLength(0);
      expect(result.finalPrice).toBe(100);
    });

    it('should handle complex nested conditions', () => {
      // Given: Rule with complex nested conditions
      const rule: PricingRule = {
        id: 'complex_nested_rule',
        name: 'Complex Nested Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical',
          and: [
            {
              type: 'demand_level',
              operator: 'equals',
              value: 'high',
              or: [
                {
                  type: 'seller_rating',
                  operator: 'greater_than',
                  value: 4.0
                }
              ]
            }
          ]
        },
        action: {
          type: 'adjust_price',
          value: 25,
          unit: 'percentage',
          reason: 'Complex nested condition'
        },
        enabled: true,
        metadata: {
          description: 'Complex nested condition test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Context matching complex condition
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'high',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Complex rule should be applied
      expect(result.appliedRules).toContain('complex_nested_rule');
      expect(result.adjustments[0].adjustment).toBe(25);
      expect(result.finalPrice).toBe(125);
    });

    it('should calculate confidence score', () => {
      // Given: Multiple rules with different priorities
      const rule1: PricingRule = {
        id: 'rule1',
        name: 'Rule 1',
        version: '1.0.0',
        priority: 10,
        condition: {
          type: 'product_type',
          operator: 'equals',
          value: 'physical'
        },
        action: {
          type: 'adjust_price',
          value: 5,
          unit: 'percentage',
          reason: 'Test'
        },
        enabled: true,
        metadata: {
          description: 'Test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      const rule2: PricingRule = {
        id: 'rule2',
        name: 'Rule 2',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'demand_level',
          operator: 'equals',
          value: 'medium'
        },
        action: {
          type: 'adjust_price',
          value: 3,
          unit: 'percentage',
          reason: 'Test'
        },
        enabled: true,
        metadata: {
          description: 'Test',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule1);
      engine.addRule(rule2);

      // Given: Context matching both rules
      const context: PricingContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        category: 'electronics',
        productType: 'physical',
        currentPrice: 100,
        costPrice: 70,
        marketPrice: 110,
        competitorPrices: [95, 105, 115],
        sellerRating: 4.5,
        demandLevel: 'medium',
        seasonalFactor: 1.0,
        region: 'US'
      };

      // When: Evaluating rules
      const result = engine.evaluateRules(context);

      // Then: Confidence should be calculated
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('PricingPolicyDSL', () => {
  describe('Rule Creation', () => {
    it('should create rule with DSL', () => {
      // When: Creating rule with DSL
      const rule = PricingPolicyDSL.createRule({
        id: 'dsl_rule',
        name: 'DSL Rule',
        version: '1.0.0',
        priority: 5,
        condition: PricingPolicyDSL.condition('product_type', 'equals', 'physical'),
        action: PricingPolicyDSL.action('adjust_price', 10, 'percentage', 'DSL test'),
        description: 'DSL rule test',
        author: 'test'
      });

      // Then: Rule should be created correctly
      expect(rule.id).toBe('dsl_rule');
      expect(rule.name).toBe('DSL Rule');
      expect(rule.priority).toBe(5);
      expect(rule.condition.type).toBe('product_type');
      expect(rule.condition.operator).toBe('equals');
      expect(rule.condition.value).toBe('physical');
      expect(rule.action.type).toBe('adjust_price');
      expect(rule.action.value).toBe(10);
      expect(rule.action.unit).toBe('percentage');
      expect(rule.action.reason).toBe('DSL test');
      expect(rule.metadata.description).toBe('DSL rule test');
      expect(rule.metadata.author).toBe('test');
    });

    it('should create condition with DSL', () => {
      // When: Creating condition with DSL
      const condition = PricingPolicyDSL.condition('demand_level', 'equals', 'high');

      // Then: Condition should be created correctly
      expect(condition.type).toBe('demand_level');
      expect(condition.operator).toBe('equals');
      expect(condition.value).toBe('high');
    });

    it('should create action with DSL', () => {
      // When: Creating action with DSL
      const action = PricingPolicyDSL.action('adjust_price', 15, 'percentage', 'Test action');

      // Then: Action should be created correctly
      expect(action.type).toBe('adjust_price');
      expect(action.value).toBe(15);
      expect(action.unit).toBe('percentage');
      expect(action.reason).toBe('Test action');
    });
  });

  describe('Complex Conditions', () => {
    it('should create AND condition with DSL', () => {
      // When: Creating AND condition with DSL
      const condition = PricingPolicyDSL.and(
        PricingPolicyDSL.condition('product_type', 'equals', 'physical'),
        PricingPolicyDSL.condition('demand_level', 'equals', 'high')
      );

      // Then: AND condition should be created correctly
      expect(condition.and).toHaveLength(2);
      expect(condition.and?.[0].type).toBe('product_type');
      expect(condition.and?.[1].type).toBe('demand_level');
    });

    it('should create OR condition with DSL', () => {
      // When: Creating OR condition with DSL
      const condition = PricingPolicyDSL.or(
        PricingPolicyDSL.condition('product_type', 'equals', 'digital'),
        PricingPolicyDSL.condition('product_type', 'equals', 'physical')
      );

      // Then: OR condition should be created correctly
      expect(condition.or).toHaveLength(2);
      expect(condition.or?.[0].type).toBe('product_type');
      expect(condition.or?.[1].type).toBe('product_type');
    });
  });
});