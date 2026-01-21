/**
 * Pricing Policies - Configuration-Driven Business Rules
 * Volatile pricing rules with versioning and DSL support
 * Pure domain logic - no external dependencies
 */

export interface PricingRule {
  id: string;
  name: string;
  version: string;
  priority: number;
  condition: PricingCondition;
  action: PricingAction;
  enabled: boolean;
  metadata: {
    description: string;
    createdAt: Date;
    updatedAt: Date;
    author: string;
  };
}

export interface PricingCondition {
  type: 'product_type' | 'price_range' | 'category' | 'seller_rating' | 'market_data' | 'demand_level';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'contains';
  value: any;
  and?: PricingCondition[];
  or?: PricingCondition[];
}

export interface PricingAction {
  type: 'set_price' | 'adjust_price' | 'set_margin' | 'flag_for_review' | 'reject' | 'apply_discount';
  value: number;
  unit: 'absolute' | 'percentage' | 'multiplier';
  reason: string;
}

export interface PricingContext {
  productId: string;
  sellerId: string;
  category: string;
  productType: string;
  currentPrice: number;
  costPrice?: number;
  marketPrice?: number;
  competitorPrices?: number[];
  sellerRating: number;
  demandLevel: 'low' | 'medium' | 'high';
  seasonalFactor: number;
  region: string;
}

export interface PricingRuleResult {
  appliedRules: string[];
  finalPrice: number;
  adjustments: Array<{
    ruleId: string;
    adjustment: number;
    reason: string;
  }>;
  flags: string[];
  confidence: number;
}

export class PricingRuleEngine {
  constructor(private rules: PricingRule[] = []) {}

  addRule(rule: PricingRule): void {
    // Remove existing rule with same ID
    this.rules = this.rules.filter(r => r.id !== rule.id);
    this.rules.push(rule);

    // Sort by priority (higher priority first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  getRule(ruleId: string): PricingRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  getAllRules(): PricingRule[] {
    return [...this.rules];
  }

  evaluateRules(context: PricingContext): PricingRuleResult {
    const appliedRules: string[] = [];
    const adjustments: Array<{ ruleId: string; adjustment: number; reason: string }> = [];
    const flags: string[] = [];

    let currentPrice = context.currentPrice;
    let totalConfidence = 0;
    let ruleCount = 0;

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.evaluateCondition(rule.condition, context)) {
        appliedRules.push(rule.id);

        const adjustment = this.executeAction(rule.action, currentPrice, context);
        if (adjustment !== 0) {
          adjustments.push({
            ruleId: rule.id,
            adjustment,
            reason: rule.action.reason
          });
          currentPrice += adjustment;
        }

        if (rule.action.type === 'flag_for_review') {
          flags.push(rule.action.reason);
        }

        totalConfidence += rule.priority;
        ruleCount++;
      }
    }

    const averageConfidence = ruleCount > 0 ? totalConfidence / ruleCount / 10 : 0.5;

    return {
      appliedRules,
      finalPrice: Math.max(0, currentPrice), // Ensure non-negative price
      adjustments,
      flags,
      confidence: Math.min(averageConfidence, 1.0)
    };
  }

  private evaluateCondition(condition: PricingCondition, context: PricingContext): boolean {
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
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: PricingContext): any {
    switch (field) {
      case 'product_type':
        return context.productType;
      case 'price_range':
        return context.currentPrice;
      case 'category':
        return context.category;
      case 'seller_rating':
        return context.sellerRating;
      case 'market_data':
        return context.marketPrice || 0;
      case 'demand_level':
        return context.demandLevel;
      default:
        return null;
    }
  }

  private executeAction(action: PricingAction, currentPrice: number, context: PricingContext): number {
    switch (action.type) {
      case 'set_price':
        return action.unit === 'absolute' ? action.value - currentPrice : 0; // Absolute set would be handled differently

      case 'adjust_price':
        if (action.unit === 'percentage') {
          return currentPrice * (action.value / 100);
        } else if (action.unit === 'absolute') {
          return action.value;
        } else if (action.unit === 'multiplier') {
          return currentPrice * (action.value - 1);
        }
        return 0;

      case 'set_margin':
        if (context.costPrice) {
          const targetPrice = context.costPrice * (1 + action.value / 100);
          return targetPrice - currentPrice;
        }
        return 0;

      default:
        return 0;
    }
  }
}

export class PricingPolicyDSL {
  static createRule(config: {
    id: string;
    name: string;
    version?: string;
    priority?: number;
    condition: PricingCondition;
    action: PricingAction;
    description?: string;
    author?: string;
  }): PricingRule {
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

  static condition(type: PricingCondition['type'], operator: PricingCondition['operator'], value: any): PricingCondition {
    return { type, operator, value };
  }

  static and(...conditions: PricingCondition[]): PricingCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, and: conditions };
  }

  static or(...conditions: PricingCondition[]): PricingCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, or: conditions };
  }

  static action(type: PricingAction['type'], value: number, unit: PricingAction['unit'], reason: string): PricingAction {
    return { type, value, unit, reason };
  }
}

// Pre-configured common pricing rules
export const DEFAULT_PRICING_RULES: PricingRule[] = [
  // High demand premium pricing
  PricingPolicyDSL.createRule({
    id: 'premium_demand_pricing',
    name: 'Premium Demand Pricing',
    priority: 10,
    condition: PricingPolicyDSL.condition('demand_level', 'equals', 'high'),
    action: PricingPolicyDSL.action('adjust_price', 15, 'percentage', 'High demand justifies premium pricing'),
    description: 'Apply 15% premium for high-demand products'
  }),

  // Low demand discount
  PricingPolicyDSL.createRule({
    id: 'discount_low_demand',
    name: 'Low Demand Discount',
    priority: 8,
    condition: PricingPolicyDSL.condition('demand_level', 'equals', 'low'),
    action: PricingPolicyDSL.action('adjust_price', -10, 'percentage', 'Discount to stimulate low demand'),
    description: 'Apply 10% discount for low-demand products'
  }),

  // Minimum margin protection
  PricingPolicyDSL.createRule({
    id: 'minimum_margin_protection',
    name: 'Minimum Margin Protection',
    priority: 15,
    condition: PricingPolicyDSL.condition('price_range', 'less_than', 10),
    action: PricingPolicyDSL.action('set_margin', 20, 'percentage', 'Ensure minimum 20% margin'),
    description: 'Protect minimum 20% margin on low-price products'
  }),

  // Flag high-value items for review
  PricingPolicyDSL.createRule({
    id: 'high_value_review',
    name: 'High Value Item Review',
    priority: 5,
    condition: PricingPolicyDSL.condition('price_range', 'greater_than', 1000),
    action: PricingPolicyDSL.action('flag_for_review', 0, 'absolute', 'High-value items require manual review'),
    description: 'Flag items over $1000 for manual review'
  })
];
