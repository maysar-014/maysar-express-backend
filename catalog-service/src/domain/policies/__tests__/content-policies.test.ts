/**
 * Content Policies Tests
 * 
 * Purpose: Validates content business rules and policies for catalog domain
 * Scope: Domain layer testing with zero external dependencies
 * Coverage Target: 98% (critical business logic)
 * 
 * Test Categories:
 * - Content rule engine functionality
 * - Content validation and scoring
 * - DSL rule creation
 * - Edge cases and error conditions
 */

import { ContentRuleEngine, ContentPolicyDSL, DEFAULT_CONTENT_RULES } from '../content-policies';
import { ContentContext, ContentRule, ContentCondition, ContentAction } from '../content-policies';

describe('ContentRuleEngine', () => {
  let engine: ContentRuleEngine;

  beforeEach(() => {
    engine = new ContentRuleEngine();
  });

  describe('Rule Management', () => {
    it('should add a new rule', () => {
      // Given: A new content rule
      const rule: ContentRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'content_length',
          operator: 'greater_than',
          value: 50
        },
        action: {
          type: 'approve',
          value: 'approved',
          reason: 'Content meets length requirements',
          severity: 'low'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for content engine',
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
      const rule: ContentRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'content_length',
          operator: 'greater_than',
          value: 50
        },
        action: {
          type: 'approve',
          value: 'approved',
          reason: 'Content meets length requirements',
          severity: 'low'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for content engine',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // When: Updating the rule
      const updatedRule: ContentRule = {
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
      const rule: ContentRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'content_length',
          operator: 'greater_than',
          value: 50
        },
        action: {
          type: 'approve',
          value: 'approved',
          reason: 'Content meets length requirements',
          severity: 'low'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for content engine',
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
      const rule: ContentRule = {
        id: 'test_rule',
        name: 'Test Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'content_length',
          operator: 'greater_than',
          value: 50
        },
        action: {
          type: 'approve',
          value: 'approved',
          reason: 'Content meets length requirements',
          severity: 'low'
        },
        enabled: true,
        metadata: {
          description: 'Test rule for content engine',
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
      const rule1: ContentRule = {
        id: 'rule1',
        name: 'Rule 1',
        version: '1.0.0',
        priority: 1,
        condition: { type: 'content_length', operator: 'greater_than', value: 50 },
        action: { type: 'approve', value: 'approved', reason: 'Test', severity: 'low' },
        enabled: true,
        metadata: { description: 'Test', createdAt: new Date(), updatedAt: new Date(), author: 'test' }
      };

      const rule2: ContentRule = {
        id: 'rule2',
        name: 'Rule 2',
        version: '1.0.0',
        priority: 10,
        condition: { type: 'content_length', operator: 'greater_than', value: 100 },
        action: { type: 'approve', value: 'approved', reason: 'Test', severity: 'low' },
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

  describe('Content Validation', () => {
    it('should validate content with sufficient length', () => {
      // Given: Content rule and context
      const rule: ContentRule = {
        id: 'length_rule',
        name: 'Length Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'content_length',
          operator: 'greater_than',
          value: 50
        },
        action: {
          type: 'approve',
          value: 'approved',
          reason: 'Content meets length requirements',
          severity: 'low'
        },
        enabled: true,
        metadata: {
          description: 'Length validation rule',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Content context with sufficient length
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Test Product',
        description: 'This is a detailed product description that exceeds the minimum length requirement of 50 characters.',
        tags: ['test', 'product', 'quality'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Content should be approved
      expect(result.appliedRules).toContain('length_rule');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.canPublish).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject content with insufficient length', () => {
      // Given: Content rule and context with short description
      const rule: ContentRule = {
        id: 'length_rule',
        name: 'Length Rule',
        version: '1.0.0',
        priority: 5,
        condition: {
          type: 'content_length',
          operator: 'less_than',
          value: 50
        },
        action: {
          type: 'require_changes',
          value: 'insufficient_length',
          reason: 'Description too short - minimum 50 characters required',
          severity: 'high',
          suggestions: ['Add detailed product specifications', 'Include usage instructions', 'Describe key features and benefits']
        },
        enabled: true,
        metadata: {
          description: 'Length validation rule',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Content context with insufficient length
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Test Product',
        description: 'Short description.',
        tags: ['test'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Content should be rejected
      expect(result.appliedRules).toContain('length_rule');
      expect(result.canPublish).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('high');
      expect(result.issues[0].message).toContain('Description too short');
    });

    it('should detect spam content', () => {
      // Given: Spam detection rule
      const rule: ContentRule = {
        id: 'spam_detection',
        name: 'Spam Detection',
        version: '1.0.0',
        priority: 15,
        condition: {
          type: 'spam_indicators',
          operator: 'greater_than',
          value: 30
        },
        action: {
          type: 'flag_for_review',
          value: 'spam_suspected',
          reason: 'Content shows spam indicators',
          severity: 'high',
          suggestions: ['Remove excessive promotional language', 'Use natural, descriptive text']
        },
        enabled: true,
        metadata: {
          description: 'Spam detection rule',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Content context with spam indicators
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'BUY NOW! LIMITED TIME! AMAZING DEAL!',
        description: 'BUY NOW! LIMITED TIME! AMAZING DEAL! FREE SHIPPING! GUARANTEED! This is the best product ever! Buy buy buy!',
        tags: ['buy', 'now', 'sale', 'deal'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Content should be flagged for review
      expect(result.appliedRules).toContain('spam_detection');
      expect(result.canPublish).toBe(true); // Flagged for review but can still publish
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('high');
      expect(result.issues[0].message).toContain('Content shows spam indicators');
    });

    it('should validate content completeness', () => {
      // Given: Completeness validation rule
      const rule: ContentRule = {
        id: 'completeness_check',
        name: 'Completeness Check',
        version: '1.0.0',
        priority: 10,
        condition: {
          type: 'completeness',
          operator: 'less_than',
          value: 60
        },
        action: {
          type: 'require_changes',
          value: 'incomplete',
          reason: 'Product listing incomplete',
          severity: 'medium',
          suggestions: ['Add product images', 'Include detailed description', 'Add relevant tags']
        },
        enabled: true,
        metadata: {
          description: 'Completeness validation rule',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test'
        }
      };

      engine.addRule(rule);

      // Given: Incomplete content context
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Test Product',
        description: 'A product.',
        tags: [],
        category: 'electronics',
        productType: 'physical',
        images: [],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Content should require changes
      expect(result.appliedRules).toContain('completeness_check');
      expect(result.canPublish).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('medium');
      expect(result.issues[0].message).toContain('Product listing incomplete');
    });
  });

  describe('Quality Metrics Calculation', () => {
    it('should calculate quality metrics correctly', () => {
      // Given: Complete content context
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Premium Product - Best Quality Available',
        description: 'This premium product features advanced technology, durable construction, and exceptional performance. Perfect for professionals and enthusiasts alike. Our product offers excellent value and quality craftsmanship.',
        tags: ['premium', 'quality', 'performance', 'professional'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product front view', size: 1024000 },
          { url: 'image2.jpg', altText: 'Product back view', size: 1536000 }
        ],
        sellerRating: 4.8,
        sellerHistory: {
          violations: 0,
          approvedProducts: 50,
          rejectedProducts: 2
        },
        language: 'en',
        marketSegment: 'professional'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Quality metrics should be calculated
      expect(result.qualityMetrics.completeness).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.readability).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.uniqueness).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.compliance).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should calculate readability score', () => {
      // Given: Content with good readability
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Easy to Use Product',
        description: 'Our product is easy to use and provides excellent results for all users. Simple setup and intuitive interface make it perfect for beginners.',
        tags: ['easy', 'use', 'beginner'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Readability score should be reasonable
      expect(result.qualityMetrics.readability).toBeGreaterThan(40);
    });

    it('should calculate uniqueness score', () => {
      // Given: Content with unique description
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Unique Product Design',
        description: 'Our unique product design ensures optimal performance and user satisfaction. Unlike other products, ours features patented technology and custom engineering.',
        tags: ['unique', 'design', 'patented'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Uniqueness score should be high
      expect(result.qualityMetrics.uniqueness).toBeGreaterThan(70);
    });
  });

  describe('Default Rules', () => {
    it('should include default content validation rules', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new ContentRuleEngine(DEFAULT_CONTENT_RULES);

      // When: Getting all rules
      const rules = engineWithDefaults.getAllRules();

      // Then: Default rules should be present
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.id === 'prohibited_content_rejection')).toBe(true);
      expect(rules.some(r => r.id === 'minimum_content_length')).toBe(true);
      expect(rules.some(r => r.id === 'spam_content_detection')).toBe(true);
      expect(rules.some(r => r.id === 'quality_improvement_suggestions')).toBe(true);
    });

    it('should apply prohibited content rejection rule', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new ContentRuleEngine(DEFAULT_CONTENT_RULES);

      // Given: Content with prohibited terms
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Illegal Product',
        description: 'This product contains illegal substances and is not compliant with regulations.',
        tags: ['illegal', 'substances'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engineWithDefaults.validateContent(context);

      // Then: Content should be rejected
      expect(result.appliedRules).toContain('prohibited_content_rejection');
      expect(result.canPublish).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('critical');
    });

    it('should apply minimum content length rule', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new ContentRuleEngine(DEFAULT_CONTENT_RULES);

      // Given: Content with insufficient length
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Short',
        description: 'x'.repeat(40), // Less than 50 characters
        tags: ['short'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engineWithDefaults.validateContent(context);

      // Then: Content should require changes
      expect(result.appliedRules).toContain('minimum_content_length');
      expect(result.canPublish).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0); // May have multiple issues
      expect(result.issues[0].severity).toBe('high');
    });

    it('should apply spam detection rule', () => {
      // Given: Engine with default rules
      const engineWithDefaults = new ContentRuleEngine(DEFAULT_CONTENT_RULES);

      // Given: Content with spam indicators
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'BUY NOW! LIMITED TIME! AMAZING DEAL!',
        description: 'BUY NOW! LIMITED TIME! AMAZING DEAL! FREE SHIPPING! GUARANTEED! This is the best product ever!',
        tags: ['buy', 'now', 'sale', 'deal'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engineWithDefaults.validateContent(context);

      // Then: Content should be flagged for review
      expect(result.appliedRules).toContain('spam_content_detection');
      expect(result.canPublish).toBe(true); // Flagged for review but can still publish
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('high');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      // Given: Empty content context
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: '',
        description: '',
        tags: [],
        category: 'electronics',
        productType: 'physical',
        images: [],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Should handle gracefully with low scores
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.completeness).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.readability).toBeGreaterThanOrEqual(0);
    });


    it('should handle very long content', () => {
      // Given: Very long content
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'A'.repeat(100),
        description: 'A'.repeat(10000),
        tags: Array(50).fill('tag'),
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Should handle long content
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.completeness).toBeGreaterThan(0);
    });

    it('should calculate confidence score', () => {
      // Given: Content context
      const context: ContentContext = {
        productId: 'test_product',
        sellerId: 'test_seller',
        title: 'Test Product',
        description: 'This is a test product description.',
        tags: ['test'],
        category: 'electronics',
        productType: 'physical',
        images: [
          { url: 'image1.jpg', altText: 'Product image', size: 1024000 }
        ],
        sellerRating: 4.5,
        sellerHistory: {
          violations: 0,
          approvedProducts: 10,
          rejectedProducts: 1
        },
        language: 'en',
        marketSegment: 'consumer'
      };

      // When: Validating content
      const result = engine.validateContent(context);

      // Then: Confidence should be calculated
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('ContentPolicyDSL', () => {
  describe('Rule Creation', () => {
    it('should create rule with DSL', () => {
      // When: Creating rule with DSL
      const rule = ContentPolicyDSL.createRule({
        id: 'dsl_rule',
        name: 'DSL Rule',
        version: '1.0.0',
        priority: 5,
        condition: ContentPolicyDSL.condition('content_length', 'greater_than', 50),
        action: ContentPolicyDSL.action('approve', 'approved', 'Content meets requirements', 'low'),
        description: 'DSL rule test',
        author: 'test'
      });

      // Then: Rule should be created correctly
      expect(rule.id).toBe('dsl_rule');
      expect(rule.name).toBe('DSL Rule');
      expect(rule.priority).toBe(5);
      expect(rule.condition.type).toBe('content_length');
      expect(rule.condition.operator).toBe('greater_than');
      expect(rule.condition.value).toBe(50);
      expect(rule.action.type).toBe('approve');
      expect(rule.action.value).toBe('approved');
      expect(rule.action.reason).toBe('Content meets requirements');
      expect(rule.action.severity).toBe('low');
      expect(rule.metadata.description).toBe('DSL rule test');
      expect(rule.metadata.author).toBe('test');
    });

    it('should create condition with DSL', () => {
      // When: Creating condition with DSL
      const condition = ContentPolicyDSL.condition('content_length', 'greater_than', 50);

      // Then: Condition should be created correctly
      expect(condition.type).toBe('content_length');
      expect(condition.operator).toBe('greater_than');
      expect(condition.value).toBe(50);
    });

    it('should create action with DSL', () => {
      // When: Creating action with DSL
      const action = ContentPolicyDSL.action('approve', 'approved', 'Content is valid', 'medium');

      // Then: Action should be created correctly
      expect(action.type).toBe('approve');
      expect(action.value).toBe('approved');
      expect(action.reason).toBe('Content is valid');
      expect(action.severity).toBe('medium');
    });
  });

  describe('Complex Conditions', () => {
    it('should create AND condition with DSL', () => {
      // When: Creating AND condition with DSL
      const condition = ContentPolicyDSL.and(
        ContentPolicyDSL.condition('content_length', 'greater_than', 50),
        ContentPolicyDSL.condition('quality_score', 'greater_than', 70)
      );

      // Then: AND condition should be created correctly
      expect(condition.and).toHaveLength(2);
      expect(condition.and?.[0].type).toBe('content_length');
      expect(condition.and?.[1].type).toBe('quality_score');
    });

    it('should create OR condition with DSL', () => {
      // When: Creating OR condition with DSL
      const condition = ContentPolicyDSL.or(
        ContentPolicyDSL.condition('content_length', 'greater_than', 100),
        ContentPolicyDSL.condition('readability', 'greater_than', 80)
      );

      // Then: OR condition should be created correctly
      expect(condition.or).toHaveLength(2);
      expect(condition.or?.[0].type).toBe('content_length');
      expect(condition.or?.[1].type).toBe('readability');
    });
  });
});