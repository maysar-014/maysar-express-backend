/**
 * Visibility Policies Tests
 * Tests for domain business policies with rule-based visibility evaluation
 */

import {
  VisibilityRuleEngine,
  VisibilityRule,
  VisibilityContext,
  VisibilityRuleResult,
  VisibilityPolicyDSL,
  DEFAULT_VISIBILITY_RULES,
  VisibilityCondition,
  VisibilityAction
} from '../../policies/visibility-policies';

describe('VisibilityRuleEngine', () => {
  let engine;
  let mockContext;

  beforeEach(() => {
    engine = new VisibilityRuleEngine();

    mockContext = {
      productId: 'product-123',
      sellerId: 'seller-456',
      currentVisibility: 'public',
      category: 'electronics',
      price: 99.99,
      productStatus: 'published',
      sellerRating: 4.5,
      sellerTier: 'established',
      accountAge: 365,
      violationCount: 0,
      reviewCount: 150,
      successfulSales: 500,
      returnRate: 0.02,
      region: 'us-east',
      marketSegment: 'consumer'
    };
  });

  describe('Rule Engine Creation and Management', () => {
    it('should create an empty rule engine', () => {
      expect(engine).toBeDefined();
      expect(engine.getAllRules()).toHaveLength(0);
    });

    it('should add and retrieve rules', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'test-rule',
        name: 'Test Rule',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'High-rated seller')
      });

      engine.addRule(rule);

      const retrievedRule = engine.getRule('test-rule');
      expect(retrievedRule).toEqual(rule);
      expect(engine.getAllRules()).toHaveLength(1);
    });

    it('should remove rules', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'test-rule',
        name: 'Test Rule',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'High-rated seller')
      });

      engine.addRule(rule);
      expect(engine.getAllRules()).toHaveLength(1);

      engine.removeRule('test-rule');
      expect(engine.getAllRules()).toHaveLength(0);
      expect(engine.getRule('test-rule')).toBeUndefined();
    });

    it('should replace rules with same ID', () => {
      const rule1 = VisibilityPolicyDSL.createRule({
        id: 'test-rule',
        name: 'Rule 1',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'Rule 1')
      });

      const rule2 = VisibilityPolicyDSL.createRule({
        id: 'test-rule',
        name: 'Rule 2',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 3.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'b2b_only', 'Rule 2')
      });

      engine.addRule(rule1);
      engine.addRule(rule2);

      expect(engine.getAllRules()).toHaveLength(1);
      expect(engine.getRule('test-rule')?.name).toBe('Rule 2');
    });
  });

  describe('Rule Evaluation Logic', () => {
    it('should evaluate simple conditions', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'high-rating-rule',
        name: 'High Rating Rule',
        priority: 10,
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'High-rated seller')
      });

      engine.addRule(rule);

      const highRatingContext = { ...mockContext, sellerRating: 4.5 };
      const result = engine.evaluateRules(highRatingContext);

      expect(result.appliedRules).toContain('high-rating-rule');
      expect(result.finalVisibility).toBe('public');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should not apply rules when conditions are not met', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'high-rating-rule',
        name: 'High Rating Rule',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'High-rated seller')
      });

      engine.addRule(rule);

      const lowRatingContext = { ...mockContext, sellerRating: 3.0 };
      const result = engine.evaluateRules(lowRatingContext);

      expect(result.appliedRules).not.toContain('high-rating-rule');
      expect(result.finalVisibility).toBe('public'); // Original visibility
    });

    it('should evaluate complex conditions with multiple operators', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'complex-rule',
        name: 'Complex Rule',
        condition: VisibilityPolicyDSL.and(
          VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
          VisibilityPolicyDSL.condition('account_age', 'greater_than', 180)
        ),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'Qualified seller')
      });

      engine.addRule(rule);

      const qualifiedContext = { ...mockContext, sellerRating: 4.5, accountAge: 365 };
      const unqualifiedContext1 = { ...mockContext, sellerRating: 3.5, accountAge: 365 };
      const unqualifiedContext2 = { ...mockContext, sellerRating: 4.5, accountAge: 90 };

      expect(engine.evaluateRules(qualifiedContext).appliedRules).toContain('complex-rule');
      expect(engine.evaluateRules(unqualifiedContext1).appliedRules).not.toContain('complex-rule');
      expect(engine.evaluateRules(unqualifiedContext2).appliedRules).not.toContain('complex-rule');
    });

    it('should respect rule priority ordering', () => {
      const lowPriorityRule = VisibilityPolicyDSL.createRule({
        id: 'low-priority',
        name: 'Low Priority',
        priority: 5,
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 3.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'b2b_only', 'Basic qualification')
      });

      const highPriorityRule = VisibilityPolicyDSL.createRule({
        id: 'high-priority',
        name: 'High Priority',
        priority: 15,
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'Premium qualification')
      });

      engine.addRule(lowPriorityRule);
      engine.addRule(highPriorityRule);

      const context = { ...mockContext, sellerRating: 4.5 };
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('high-priority');
      expect(result.finalVisibility).toBe('public'); // High priority rule wins
    });
  });

  describe('Visibility Actions', () => {
    it('should execute set_visibility action', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'set-visibility-rule',
        name: 'Set Visibility',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'b2b_only', 'B2B seller')
      });

      engine.addRule(rule);

      const context = { ...mockContext, sellerRating: 4.5 };
      const result = engine.evaluateRules(context);

      expect(result.finalVisibility).toBe('b2b_only');
      expect(result.visibilityChanges).toHaveLength(1);
      expect(result.visibilityChanges[0].toVisibility).toBe('b2b_only');
    });

    it('should execute restrict_visibility action', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'restrict-rule',
        name: 'Restrict Visibility',
        condition: VisibilityPolicyDSL.condition('violation_count', 'greater_than', 5),
        action: VisibilityPolicyDSL.action('restrict_visibility', 'seller_only', 'Violations detected')
      });

      engine.addRule(rule);

      const context = { ...mockContext, currentVisibility: 'public', violationCount: 10 };
      const result = engine.evaluateRules(context);

      expect(result.finalVisibility).toBe('seller_only'); // Restricted from public
    });

    it('should execute boost_visibility action', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'boost-rule',
        name: 'Boost Visibility',
        condition: VisibilityPolicyDSL.condition('seller_tier', 'equals', 'premium'),
        action: VisibilityPolicyDSL.action('boost_visibility', 'public', 'Premium seller boost')
      });

      engine.addRule(rule);

      const context = { ...mockContext, currentVisibility: 'b2b_only', sellerTier: 'premium' };
      const result = engine.evaluateRules(context);

      expect(result.finalVisibility).toBe('public'); // Boosted from b2b_only
    });

    it('should execute hide_product action', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'hide-rule',
        name: 'Hide Product',
        condition: VisibilityPolicyDSL.condition('product_status', 'equals', 'suspended'),
        action: VisibilityPolicyDSL.action('hide_product', 'hidden', 'Product suspended')
      });

      engine.addRule(rule);

      const context = { ...mockContext, productStatus: 'suspended' };
      const result = engine.evaluateRules(context);

      expect(result.finalVisibility).toBe('hidden');
    });
  });

  describe('Default Visibility Rules', () => {
    beforeEach(() => {
      // Load default rules for testing
      DEFAULT_VISIBILITY_RULES.forEach(rule => engine.addRule(rule));
    });

    it('should apply new seller restriction rule', () => {
      const context = { ...mockContext, accountAge: 15 }; // New seller
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('new_seller_restriction');
      expect(result.finalVisibility).toBe('private');
    });

    it('should apply low rating restriction rule', () => {
      const context = { ...mockContext, sellerRating: 2.5 }; // Low rating
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('low_rating_restriction');
      expect(result.finalVisibility).toBe('seller_only');
    });

    it('should apply high value review rule', () => {
      const context = { ...mockContext, price: 600 }; // High value
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('high_value_review');
      expect(result.finalVisibility).toBe('private');
    });

    it('should apply premium seller boost rule', () => {
      const context = { ...mockContext, sellerTier: 'premium' };
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('premium_seller_boost');
      expect(result.finalVisibility).toBe('public');
    });

    it('should apply suspended product hide rule', () => {
      const context = { ...mockContext, productStatus: 'suspended' };
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('suspended_product_hide');
      expect(result.finalVisibility).toBe('hidden');
    });

    it('should apply archived product hide rule', () => {
      const context = { ...mockContext, productStatus: 'archived' };
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('archived_product_hide');
      expect(result.finalVisibility).toBe('hidden');
    });

    it('should apply B2B price visibility rule', () => {
      const context = { ...mockContext, price: 150 }; // B2B price range
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).toContain('b2b_price_visibility');
      expect(result.finalVisibility).toBe('b2b_only');
    });
  });

  describe('Rule Engine Edge Cases', () => {
    it('should handle empty rule set', () => {
      const result = engine.evaluateRules(mockContext);

      expect(result.appliedRules).toHaveLength(0);
      expect(result.finalVisibility).toBe('public'); // Original visibility
      expect(result.confidence).toBe(0.5); // Default confidence
    });

    it('should handle disabled rules', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'disabled-rule',
        name: 'Disabled Rule',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'hidden', 'Disabled rule')
      });

      rule.enabled = false;
      engine.addRule(rule);

      const context = { ...mockContext, sellerRating: 4.5 };
      const result = engine.evaluateRules(context);

      expect(result.appliedRules).not.toContain('disabled-rule');
      expect(result.finalVisibility).toBe('public');
    });

    it('should handle invalid conditions gracefully', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'invalid-condition',
        name: 'Invalid Condition',
        condition: { type: 'seller_rating', operator: 'equals', value: 'test' },
        action: VisibilityPolicyDSL.action('set_visibility', 'hidden', 'Invalid condition')
      });

      engine.addRule(rule);

      const result = engine.evaluateRules(mockContext);

      expect(result.appliedRules).not.toContain('invalid-condition');
      expect(result.finalVisibility).toBe('public');
    });

    it('should handle malformed context data', () => {
      const malformedContext = {
        ...mockContext,
        sellerRating: undefined,
        accountAge: null
      };

      const result = engine.evaluateRules(malformedContext);

      // Should not crash and return reasonable defaults
      expect(result).toBeDefined();
      expect(typeof result.finalVisibility).toBe('string');
      expect(Array.isArray(result.appliedRules)).toBe(true);
    });

    it('should handle between operator', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'between-rule',
        name: 'Between Rule',
        condition: { type: 'price_range', operator: 'between', value: [50, 200] },
        action: VisibilityPolicyDSL.action('set_visibility', 'b2b_only', 'Price in range')
      });

      engine.addRule(rule);

      const inRangeContext = { ...mockContext, price: 100 };
      const outOfRangeContext = { ...mockContext, price: 300 };

      expect(engine.evaluateRules(inRangeContext).appliedRules).toContain('between-rule');
      expect(engine.evaluateRules(outOfRangeContext).appliedRules).not.toContain('between-rule');
    });

    it('should handle in and not_in operators', () => {
      const inRule = VisibilityPolicyDSL.createRule({
        id: 'in-rule',
        name: 'In Rule',
        priority: 10,
        condition: { type: 'category', operator: 'in', value: ['electronics', 'gadgets'] },
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'Allowed category')
      });

      const notInRule = VisibilityPolicyDSL.createRule({
        id: 'not-in-rule',
        name: 'Not In Rule',
        priority: 5,
        condition: { type: 'category', operator: 'not_in', value: ['restricted', 'banned'] },
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'Not restricted category')
      });

      engine.addRule(inRule);
      
      const allowedContext = { ...mockContext, category: 'electronics' };
      expect(engine.evaluateRules(allowedContext).appliedRules).toContain('in-rule');
      
      engine.removeRule('in-rule');
      engine.addRule(notInRule);
      
      const allowedContext2 = { ...mockContext, category: 'allowed' };
      expect(engine.evaluateRules(allowedContext2).appliedRules).toContain('not-in-rule');
    });

    it('should handle unknown field types', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'unknown-field-rule',
        name: 'Unknown Field Rule',
        condition: { type: 'unknown_field' as any, operator: 'equals', value: 'test' },
        action: VisibilityPolicyDSL.action('set_visibility', 'hidden', 'Unknown field')
      });

      engine.addRule(rule);
      const result = engine.evaluateRules(mockContext);

      expect(result.appliedRules).not.toContain('unknown-field-rule');
    });

    it('should handle restrict_visibility with invalid visibility levels', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'invalid-restrict-rule',
        name: 'Invalid Restrict Rule',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: { type: 'restrict_visibility', value: 'invalid_level' as any, reason: 'Invalid level test' }
      });

      engine.addRule(rule);
      const context = { ...mockContext, currentVisibility: 'invalid_current' as any, sellerRating: 4.5 };
      const result = engine.evaluateRules(context);

      expect(result.finalVisibility).toBe('invalid_current'); // Should return current visibility
    });

    it('should handle boost_visibility with invalid visibility levels', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'invalid-boost-rule',
        name: 'Invalid Boost Rule',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: { type: 'boost_visibility', value: 'invalid_level' as any, reason: 'Invalid level test' }
      });

      engine.addRule(rule);
      const context = { ...mockContext, currentVisibility: 'invalid_current' as any, sellerRating: 4.5 };
      const result = engine.evaluateRules(context);

      expect(result.finalVisibility).toBe('invalid_current'); // Should return current visibility
    });

    it('should create DSL action with duration', () => {
      const actionWithDuration = VisibilityPolicyDSL.action('set_visibility', 'hidden', 'Temporary hide', 60);
      
      expect(actionWithDuration.duration).toBe(60);
      expect(actionWithDuration.type).toBe('set_visibility');
      expect(actionWithDuration.value).toBe('hidden');
      expect(actionWithDuration.reason).toBe('Temporary hide');
    });
  });

  describe('DSL Functionality', () => {
    it('should create rules using DSL', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'dsl-rule',
        name: 'DSL Created Rule',
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'DSL rule')
      });

      expect(rule.id).toBe('dsl-rule');
      expect(rule.condition.type).toBe('seller_rating');
      expect(rule.condition.operator).toBe('greater_than');
      expect(rule.condition.value).toBe(4.0);
      expect(rule.action.type).toBe('set_visibility');
      expect(rule.action.value).toBe('public');
    });

    it('should create complex conditions using DSL', () => {
      const complexCondition = VisibilityPolicyDSL.and(
        VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        VisibilityPolicyDSL.condition('account_age', 'greater_than', 180),
        VisibilityPolicyDSL.or(
          VisibilityPolicyDSL.condition('seller_tier', 'equals', 'premium'),
          VisibilityPolicyDSL.condition('successful_sales', 'greater_than', 1000)
        )
      );

      expect(complexCondition.and).toHaveLength(3);
      if (complexCondition.and) {
        expect(complexCondition.and[2].or).toHaveLength(2);
      }
    });

    it('should handle metadata in DSL rules', () => {
      const rule = VisibilityPolicyDSL.createRule({
        id: 'metadata-rule',
        name: 'Metadata Rule',
        version: '2.0.0',
        priority: 20,
        condition: VisibilityPolicyDSL.condition('seller_rating', 'greater_than', 4.0),
        action: VisibilityPolicyDSL.action('set_visibility', 'public', 'Metadata test'),
        description: 'Test rule with metadata',
        author: 'Test Author'
      });

      expect(rule.version).toBe('2.0.0');
      expect(rule.priority).toBe(20);
      expect(rule.metadata.description).toBe('Test rule with metadata');
      expect(rule.metadata.author).toBe('Test Author');
      expect(rule.metadata.createdAt).toBeInstanceOf(Date);
      expect(rule.metadata.updatedAt).toBeInstanceOf(Date);
    });
  });
});
