/**
 * Visibility Policies - Configuration-Driven Product Visibility Rules
 * Volatile visibility rules with versioning and DSL support
 * Pure domain logic - no external dependencies
 */

export interface VisibilityRule {
  id: string;
  name: string;
  version: string;
  priority: number;
  condition: VisibilityCondition;
  action: VisibilityAction;
  enabled: boolean;
  metadata: {
    description: string;
    createdAt: Date;
    updatedAt: Date;
    author: string;
  };
}

export interface VisibilityCondition {
  type: 'seller_rating' | 'product_status' | 'category' | 'price_range' | 'seller_tier' | 'account_age' | 'violation_count' | 'review_count' | 'successful_sales';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  and?: VisibilityCondition[];
  or?: VisibilityCondition[];
}

export interface VisibilityAction {
  type: 'set_visibility' | 'restrict_visibility' | 'boost_visibility' | 'flag_for_review' | 'hide_product';
  value: 'public' | 'private' | 'seller_only' | 'b2b_only' | 'hidden';
  reason: string;
  duration?: number; // minutes, 0 = permanent
}

export interface VisibilityContext {
  productId: string;
  sellerId: string;
  currentVisibility: 'public' | 'private' | 'seller_only' | 'b2b_only' | 'hidden';
  category: string;
  price: number;
  productStatus: 'draft' | 'pending_review' | 'published' | 'archived' | 'suspended';
  sellerRating: number;
  sellerTier: 'new' | 'established' | 'trusted' | 'premium';
  accountAge: number; // days
  violationCount: number;
  reviewCount: number;
  successfulSales: number;
  returnRate: number;
  region: string;
  marketSegment: string;
}

export interface VisibilityRuleResult {
  appliedRules: string[];
  finalVisibility: 'public' | 'private' | 'seller_only' | 'b2b_only' | 'hidden';
  visibilityChanges: Array<{
    ruleId: string;
    fromVisibility: string;
    toVisibility: string;
    reason: string;
    duration?: number;
  }>;
  flags: string[];
  confidence: number;
}

export class VisibilityRuleEngine {
  constructor(private rules: VisibilityRule[] = []) {}

  addRule(rule: VisibilityRule): void {
    this.rules = this.rules.filter(r => r.id !== rule.id);
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  getRule(ruleId: string): VisibilityRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  getAllRules(): VisibilityRule[] {
    return [...this.rules];
  }

  evaluateRules(context: VisibilityContext): VisibilityRuleResult {
    const appliedRules: string[] = [];
    const visibilityChanges: Array<{
      ruleId: string;
      fromVisibility: string;
      toVisibility: string;
      reason: string;
      duration?: number;
    }> = [];
    const flags: string[] = [];

    let currentVisibility = context.currentVisibility;
    let totalConfidence = 0;
    let ruleCount = 0;

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.evaluateCondition(rule.condition, context)) {
        appliedRules.push(rule.id);

        const newVisibility = this.executeAction(rule.action, currentVisibility);
        if (newVisibility !== currentVisibility) {
          visibilityChanges.push({
            ruleId: rule.id,
            fromVisibility: currentVisibility,
            toVisibility: newVisibility,
            reason: rule.action.reason,
            duration: rule.action.duration
          });
          currentVisibility = newVisibility;
        }

        totalConfidence += rule.priority;
        ruleCount++;

        // Higher priority rules win - break after first matching rule
        break;
      }
    }

    const averageConfidence = ruleCount > 0 ? totalConfidence / ruleCount / 10 : 0.5;

    return {
      appliedRules,
      finalVisibility: currentVisibility,
      visibilityChanges,
      flags,
      confidence: Math.min(averageConfidence, 1.0)
    };
  }

  private evaluateCondition(condition: VisibilityCondition, context: VisibilityContext): boolean {
    // Handle complex conditions with AND/OR operators
    if (condition.and) {
      return condition.and.every(subCondition => this.evaluateCondition(subCondition, context));
    }
    
    if (condition.or) {
      return condition.or.some(subCondition => this.evaluateCondition(subCondition, context));
    }
    
    // Handle simple conditions
    const fieldValue = this.getFieldValue(condition.type, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return fieldValue > condition.value;
      case 'less_than':
        return fieldValue < condition.value;
      case 'between':
        return fieldValue >= condition.value[0] && fieldValue <= condition.value[1];
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: VisibilityContext): any {
    switch (field) {
      case 'seller_rating':
        return context.sellerRating;
      case 'product_status':
        return context.productStatus;
      case 'category':
        return context.category;
      case 'price_range':
        return context.price;
      case 'seller_tier':
        return context.sellerTier;
      case 'account_age':
        return context.accountAge;
      case 'violation_count':
        return context.violationCount;
      case 'review_count':
        return context.reviewCount;
      case 'successful_sales':
        return context.successfulSales;
      default:
        return null;
    }
  }

  private executeAction(action: VisibilityAction, currentVisibility: string): 'public' | 'private' | 'seller_only' | 'b2b_only' | 'hidden' {
    switch (action.type) {
      case 'set_visibility':
        return action.value;
      case 'restrict_visibility':
        // Restrict visibility based on current level
        const visibilityLevels: ('public' | 'private' | 'seller_only' | 'b2b_only' | 'hidden')[] = ['hidden', 'seller_only', 'private', 'b2b_only', 'public'];
        const currentIndex = visibilityLevels.indexOf(currentVisibility as any);
        const restrictIndex = visibilityLevels.indexOf(action.value);
        if (currentIndex === -1 || restrictIndex === -1) return currentVisibility as any;
        return visibilityLevels[Math.min(currentIndex, restrictIndex)];
      case 'boost_visibility':
        // Boost visibility (opposite of restrict)
        const boostLevels: ('public' | 'private' | 'seller_only' | 'b2b_only' | 'hidden')[] = ['hidden', 'seller_only', 'private', 'b2b_only', 'public'];
        const currentBoostIndex = boostLevels.indexOf(currentVisibility as any);
        const boostIndex = boostLevels.indexOf(action.value);
        if (currentBoostIndex === -1 || boostIndex === -1) return currentVisibility as any;
        return boostLevels[Math.max(currentBoostIndex, boostIndex)];
      case 'hide_product':
        return 'hidden';
      default:
        return currentVisibility as any;
    }
  }
}

export class VisibilityPolicyDSL {
  static createRule(config: {
    id: string;
    name: string;
    version?: string;
    priority?: number;
    condition: VisibilityCondition;
    action: VisibilityAction;
    description?: string;
    author?: string;
  }): VisibilityRule {
    return {
      id: config.id,
      name: config.name,
      version: config.version || '1.0.0',
      priority: config.priority || 1,
      condition: config.condition,
      action: config.action,
      enabled: true,
      metadata: {
        description: config.description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: config.author || 'system'
      }
    };
  }

  static condition(type: VisibilityCondition['type'], operator: VisibilityCondition['operator'], value: any): VisibilityCondition {
    return { type, operator, value };
  }

  static and(...conditions: VisibilityCondition[]): VisibilityCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, and: conditions };
  }

  static or(...conditions: VisibilityCondition[]): VisibilityCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, or: conditions };
  }

  static action(type: VisibilityAction['type'], value: VisibilityAction['value'], reason: string, duration?: number): VisibilityAction {
    return { type, value, reason, duration };
  }
}

// Pre-configured common visibility rules
export const DEFAULT_VISIBILITY_RULES: VisibilityRule[] = [
  // New sellers get restricted visibility
  VisibilityPolicyDSL.createRule({
    id: 'new_seller_restriction',
    name: 'New Seller Visibility Restriction',
    priority: 15,
    condition: VisibilityPolicyDSL.condition('account_age', 'less_than', 30),
    action: VisibilityPolicyDSL.action('restrict_visibility', 'private', 'New sellers limited to private visibility for first 30 days'),
    description: 'Restrict new sellers to private visibility initially'
  }),

  // Low-rated sellers get reduced visibility
  VisibilityPolicyDSL.createRule({
    id: 'low_rating_restriction',
    name: 'Low Rating Visibility Restriction',
    priority: 12,
    condition: VisibilityPolicyDSL.condition('seller_rating', 'less_than', 3.0),
    action: VisibilityPolicyDSL.action('restrict_visibility', 'seller_only', 'Low-rated sellers restricted to seller-only visibility'),
    description: 'Restrict low-rated sellers visibility'
  }),

  // High-value items get enhanced scrutiny
  VisibilityPolicyDSL.createRule({
    id: 'high_value_review',
    name: 'High Value Item Review',
    priority: 10,
    condition: VisibilityPolicyDSL.condition('price_range', 'greater_than', 500),
    action: VisibilityPolicyDSL.action('set_visibility', 'private', 'High-value items require manual review before public visibility'),
    description: 'High-value items need review before going public'
  }),

  // Premium sellers get boosted visibility
  VisibilityPolicyDSL.createRule({
    id: 'premium_seller_boost',
    name: 'Premium Seller Visibility Boost',
    priority: 8,
    condition: VisibilityPolicyDSL.condition('seller_tier', 'equals', 'premium'),
    action: VisibilityPolicyDSL.action('boost_visibility', 'public', 'Premium sellers get maximum visibility'),
    description: 'Give premium sellers maximum market exposure'
  }),

  // Suspended products are hidden
  VisibilityPolicyDSL.createRule({
    id: 'suspended_product_hide',
    name: 'Suspended Product Hiding',
    priority: 20,
    condition: VisibilityPolicyDSL.condition('product_status', 'equals', 'suspended'),
    action: VisibilityPolicyDSL.action('hide_product', 'hidden', 'Suspended products are hidden from all visibility'),
    description: 'Automatically hide suspended products'
  }),

  // Archived products are hidden
  VisibilityPolicyDSL.createRule({
    id: 'archived_product_hide',
    name: 'Archived Product Hiding',
    priority: 18,
    condition: VisibilityPolicyDSL.condition('product_status', 'equals', 'archived'),
    action: VisibilityPolicyDSL.action('hide_product', 'hidden', 'Archived products are hidden from visibility'),
    description: 'Automatically hide archived products'
  }),

  // B2B products for business customers
  VisibilityPolicyDSL.createRule({
    id: 'b2b_price_visibility',
    name: 'B2B Price-Based Visibility',
    priority: 5,
    condition: VisibilityPolicyDSL.condition('price_range', 'greater_than', 100),
    action: VisibilityPolicyDSL.action('set_visibility', 'b2b_only', 'High-price items suitable for B2B visibility'),
    description: 'Route high-price items to B2B marketplace'
  })
];
