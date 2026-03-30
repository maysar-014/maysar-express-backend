/**
 * Inventory Policies - Configuration-Driven Stock Management Rules
 * Volatile inventory rules with versioning and DSL support
 * Pure domain logic - no external dependencies
 */

import { InventoryLevel, SafetyStock } from '../value-objects/inventory.value-object';

export interface InventoryRule {
  id: string;
  name: string;
  version: string;
  priority: number;
  condition: InventoryCondition;
  action: InventoryAction;
  enabled: boolean;
  metadata: {
    description: string;
    createdAt: Date;
    updatedAt: Date;
    author: string;
  };
}

export interface InventoryCondition {
  type: 'stock_level' | 'reorder_point' | 'demand_rate' | 'seasonal_factor' | 'product_category' | 'supplier_reliability' | 'lead_time';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  and?: InventoryCondition[];
  or?: InventoryCondition[];
}

export interface InventoryAction {
  type: 'reorder' | 'adjust_reorder_point' | 'flag_shortage' | 'increase_safety_stock' | 'decrease_safety_stock' | 'alert_manager';
  value: number;
  unit: 'absolute' | 'percentage' | 'multiplier';
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface InventoryContext {
  productId: string;
  variantId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  maximumStock: number;
  demandRate: number; // units per day
  leadTime: number; // days
  supplierReliability: number; // 0-1
  seasonalFactor: number; // multiplier
  category: string;
  productType: string;
  lastRestockDate: Date;
  stockoutEvents: number; // last 30 days
  salesHistory: number[]; // last 30 days
  region: string;
  marketDemand: 'low' | 'medium' | 'high';
}

export interface InventoryRuleResult {
  appliedRules: string[];
  recommendedActions: Array<{
    ruleId: string;
    action: InventoryAction;
    reasoning: string;
    priority: number;
  }>;
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    ruleId: string;
  }>;
  stockMetrics: {
    daysToDepletion: number;
    reorderUrgency: 'low' | 'medium' | 'high' | 'critical';
    stockoutRisk: number;
  };
  confidence: number;
}

export class InventoryRuleEngine {
  constructor(private rules: InventoryRule[] = []) {}

  addRule(rule: InventoryRule): void {
    this.rules = this.rules.filter(r => r.id !== rule.id);
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  getRule(ruleId: string): InventoryRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  getAllRules(): InventoryRule[] {
    return [...this.rules];
  }

  evaluateRules(context: InventoryContext): InventoryRuleResult {
    const appliedRules: string[] = [];
    const recommendedActions: Array<{
      ruleId: string;
      action: InventoryAction;
      reasoning: string;
      priority: number;
    }> = [];
    const alerts: Array<{
      level: 'info' | 'warning' | 'critical';
      message: string;
      ruleId: string;
    }> = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.evaluateCondition(rule.condition, context)) {
        appliedRules.push(rule.id);

        const action = this.executeAction(rule.action, context);
        recommendedActions.push({
          ruleId: rule.id,
          action: rule.action,
          reasoning: action.reasoning,
          priority: rule.priority
        });

        if (rule.action.urgency === 'critical') {
          alerts.push({
            level: 'critical',
            message: rule.action.reason,
            ruleId: rule.id
          });
        } else if (rule.action.urgency === 'high') {
          alerts.push({
            level: 'warning',
            message: rule.action.reason,
            ruleId: rule.id
          });
        }
      }
    }

    const stockMetrics = this.calculateStockMetrics(context);
    const confidence = this.calculateConfidence(appliedRules.length, context);

    return {
      appliedRules,
      recommendedActions,
      alerts,
      stockMetrics,
      confidence
    };
  }

  private evaluateCondition(condition: InventoryCondition, context: InventoryContext): boolean {
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

  private getFieldValue(field: string, context: InventoryContext): any {
    switch (field) {
      case 'stock_level':
        return context.availableStock;
      case 'reorder_point':
        return context.reorderPoint;
      case 'demand_rate':
        return context.demandRate;
      case 'seasonal_factor':
        return context.seasonalFactor;
      case 'product_category':
        return context.category;
      case 'supplier_reliability':
        return context.supplierReliability;
      case 'lead_time':
        return context.leadTime;
      default:
        return null;
    }
  }

  private executeAction(action: InventoryAction, context: InventoryContext): { reasoning: string } {
    // Calculate specific reasoning based on action and context
    let reasoning = action.reason;

    switch (action.type) {
      case 'reorder': {
        const reorderQuantity = this.calculateReorderQuantity(action, context);
        reasoning += ` Recommended reorder quantity: ${reorderQuantity} units`;
        break;
      }
      case 'adjust_reorder_point': {
        const newReorderPoint = this.calculateOptimalReorderPoint(context);
        reasoning += ` Suggested reorder point: ${newReorderPoint} units`;
        break;
      }
      case 'increase_safety_stock':
      case 'decrease_safety_stock': {
        const safetyStockChange = this.calculateSafetyStockAdjustment(action, context);
        reasoning += ` Safety stock adjustment: ${safetyStockChange > 0 ? '+' : ''}${safetyStockChange} units`;
        break;
      }
    }

    return { reasoning };
  }

  private calculateReorderQuantity(action: InventoryAction, context: InventoryContext): number {
    const demandDuringLeadTime = context.demandRate * context.leadTime;
    const safetyStock = demandDuringLeadTime * 0.5; // 50% safety buffer
    const targetStock = context.maximumStock - context.reorderPoint;

    return Math.ceil(demandDuringLeadTime + safetyStock + (targetStock * (action.value / 100)));
  }

  private calculateOptimalReorderPoint(context: InventoryContext): number {
    const demandDuringLeadTime = context.demandRate * context.leadTime;
    const safetyStock = demandDuringLeadTime * (1 - context.supplierReliability);
    return Math.ceil(demandDuringLeadTime + safetyStock);
  }

  private calculateSafetyStockAdjustment(action: InventoryAction, context: InventoryContext): number {
    const baseSafetyStock = context.demandRate * context.leadTime * 0.5;
    const reliabilityFactor = 1 - context.supplierReliability;

    if (action.type === 'increase_safety_stock') {
      return Math.ceil(baseSafetyStock * action.value / 100 * reliabilityFactor);
    } else {
      return -Math.ceil(baseSafetyStock * action.value / 100 * reliabilityFactor);
    }
  }

  private calculateStockMetrics(context: InventoryContext): InventoryRuleResult['stockMetrics'] {
    const daysToDepletion = context.demandRate > 0 ? context.availableStock / context.demandRate : 999;

    let reorderUrgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (context.availableStock <= 0) {
      reorderUrgency = 'critical';
    } else if (context.availableStock <= context.reorderPoint * 0.5) {
      reorderUrgency = 'high';
    } else if (context.availableStock <= context.reorderPoint) {
      reorderUrgency = 'medium';
    }

    const stockoutRisk = Math.max(0, Math.min(1,
      (context.reorderPoint - context.availableStock) / context.reorderPoint
    ));

    return {
      daysToDepletion: Math.round(daysToDepletion * 10) / 10,
      reorderUrgency,
      stockoutRisk: Math.round(stockoutRisk * 100) / 100
    };
  }

  private calculateConfidence(appliedRulesCount: number, context: InventoryContext): number {
    let confidence = 0.5;

    // More applied rules increase confidence
    confidence += Math.min(appliedRulesCount * 0.1, 0.3);

    // Reliable supplier data increases confidence
    if (context.supplierReliability > 0.8) confidence += 0.1;

    // Good sales history increases confidence
    if (context.salesHistory.length >= 7) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }
}

export class InventoryPolicyDSL {
  static createRule(config: {
    id: string;
    name: string;
    version?: string;
    priority?: number;
    condition: InventoryCondition;
    action: InventoryAction;
    description?: string;
    author?: string;
  }): InventoryRule {
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

  static condition(type: InventoryCondition['type'], operator: InventoryCondition['operator'], value: any): InventoryCondition {
    return { type, operator, value };
  }

  static and(...conditions: InventoryCondition[]): InventoryCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, and: conditions };
  }

  static or(...conditions: InventoryCondition[]): InventoryCondition {
    return { type: conditions[0].type, operator: conditions[0].operator, value: conditions[0].value, or: conditions };
  }

  static action(type: InventoryAction['type'], value: number, unit: InventoryAction['unit'], reason: string, urgency?: InventoryAction['urgency']): InventoryAction {
    return { type, value, unit, reason, urgency: urgency || 'medium' };
  }
}

// Pre-configured common inventory rules
export const DEFAULT_INVENTORY_RULES: InventoryRule[] = [
  // Critical stockout prevention
  InventoryPolicyDSL.createRule({
    id: 'critical_stockout_prevention',
    name: 'Critical Stockout Prevention',
    priority: 20,
    condition: InventoryPolicyDSL.condition('stock_level', 'less_than', 5),
    action: InventoryPolicyDSL.action('reorder', 200, 'percentage', 'Critical stock levels - immediate reorder required', 'critical'),
    description: 'Trigger emergency reorder when stock drops below 5 units'
  }),

  // Standard reorder point
  InventoryPolicyDSL.createRule({
    id: 'standard_reorder_trigger',
    name: 'Standard Reorder Trigger',
    priority: 15,
    condition: InventoryPolicyDSL.condition('stock_level', 'less_than', 10),
    action: InventoryPolicyDSL.action('reorder', 150, 'percentage', 'Stock below reorder point - standard reorder', 'high'),
    description: 'Standard reorder when stock drops below reorder point'
  }),

  // Seasonal demand adjustment
  InventoryPolicyDSL.createRule({
    id: 'seasonal_demand_boost',
    name: 'Seasonal Demand Boost',
    priority: 12,
    condition: InventoryPolicyDSL.condition('seasonal_factor', 'greater_than', 1.5),
    action: InventoryPolicyDSL.action('increase_safety_stock', 50, 'percentage', 'Seasonal demand increase detected - boost safety stock', 'medium'),
    description: 'Increase safety stock during seasonal demand spikes'
  }),

  // Unreliable supplier protection
  InventoryPolicyDSL.createRule({
    id: 'unreliable_supplier_protection',
    name: 'Unreliable Supplier Protection',
    priority: 10,
    condition: InventoryPolicyDSL.condition('supplier_reliability', 'less_than', 0.8),
    action: InventoryPolicyDSL.action('increase_safety_stock', 75, 'percentage', 'Unreliable supplier - increase safety stock buffer', 'medium'),
    description: 'Increase safety stock for unreliable suppliers'
  }),

  // High-demand product monitoring
  InventoryPolicyDSL.createRule({
    id: 'high_demand_monitoring',
    name: 'High Demand Product Monitoring',
    priority: 8,
    condition: InventoryPolicyDSL.condition('demand_rate', 'greater_than', 50),
    action: InventoryPolicyDSL.action('alert_manager', 0, 'absolute', 'High-demand product requires close monitoring', 'medium'),
    description: 'Monitor high-demand products closely'
  }),

  // Optimize reorder points for stable products
  InventoryPolicyDSL.createRule({
    id: 'stable_product_optimization',
    name: 'Stable Product Optimization',
    priority: 5,
    condition: InventoryPolicyDSL.condition('demand_rate', 'less_than', 10),
    action: InventoryPolicyDSL.action('decrease_safety_stock', 25, 'percentage', 'Stable demand allows reduced safety stock', 'low'),
    description: 'Reduce safety stock for stable, low-demand products'
  }),

  // Long lead time protection
  InventoryPolicyDSL.createRule({
    id: 'long_lead_time_protection',
    name: 'Long Lead Time Protection',
    priority: 14,
    condition: InventoryPolicyDSL.condition('lead_time', 'greater_than', 14),
    action: InventoryPolicyDSL.action('increase_safety_stock', 100, 'percentage', 'Long lead times require increased safety stock', 'high'),
    description: 'Increase safety stock for products with long lead times'
  })
];

export class InventoryPolicies {
  static validateMinimumStockLevel(inventoryLevel: InventoryLevel): boolean {
    if (inventoryLevel.current < 0) {
      throw new Error('Stock level cannot be negative');
    }
    return inventoryLevel.current >= inventoryLevel.minimum;
  }

  static validateMaximumStockLevel(inventoryLevel: InventoryLevel): boolean {
    if (inventoryLevel.maximum && inventoryLevel.current > inventoryLevel.maximum) {
      throw new Error('Stock level exceeds maximum allowed threshold');
    }
    return inventoryLevel.maximum ? inventoryLevel.current <= inventoryLevel.maximum : true;
  }

  static validateZeroStockLevel(inventoryLevel: InventoryLevel): boolean {
    return inventoryLevel.current > 0;
  }

  static calculateReorderPoint(averageDailyDemand: number, leadTimeDays: number, safetyStock: number): number {
    return (averageDailyDemand * leadTimeDays) + safetyStock;
  }

  static checkReorderThreshold(currentInventory: number, reorderPoint: number): boolean {
    return currentInventory <= reorderPoint;
  }

  static validateReorderQuantity(reorderPoint: number, orderQuantity: number): boolean {
    if (orderQuantity > reorderPoint * 20) {
      throw new Error('Reorder quantity exceeds maximum allowed threshold');
    }
    return true;
  }

  static calculateSafetyStock(maxDailyDemand: number, averageDailyDemand: number, maxLeadTimeDays: number, averageLeadTimeDays: number): number {
    return (maxDailyDemand * maxLeadTimeDays) - (averageDailyDemand * averageLeadTimeDays);
  }

  static validateSafetyStockLevel(safetyStock: SafetyStock): boolean {
    if (safetyStock.current < safetyStock.minimum) {
      throw new Error('Safety stock below minimum threshold');
    }
    return safetyStock.current >= safetyStock.minimum;
  }

  static calculateInventoryTurnoverRatio(costOfGoodsSold: number, averageInventory: number): number {
    return costOfGoodsSold / averageInventory;
  }

  static validateInventoryTurnoverRate(turnoverRate: number, targetTurnoverRate: number): boolean {
    if (turnoverRate < targetTurnoverRate) {
      throw new Error('Inventory turnover rate below minimum threshold');
    }
    return true;
  }

  static calculateDaysInventoryOutstanding(turnoverRatio: number): number {
    return 365 / turnoverRatio;
  }

  static validateDaysInventoryOutstanding(daysOutstanding: number, maxDaysOutstanding: number): boolean {
    if (daysOutstanding > maxDaysOutstanding) {
      throw new Error('Days inventory outstanding exceeds maximum threshold');
    }
    return true;
  }

  static predictStockoutRisk(currentInventory: number, dailyDemand: number, leadTimeDays: number): 'low' | 'medium' | 'high' | 'critical' {
    const daysOfStock = currentInventory / dailyDemand;
    
    if (daysOfStock < leadTimeDays * 0.5) return 'high';
    if (daysOfStock < leadTimeDays) return 'medium';
    return 'low';
  }

  static checkEmergencyReorder(currentInventory: number, dailyDemand: number, leadTimeDays: number): boolean {
    const daysOfStock = currentInventory / dailyDemand;
    return daysOfStock < leadTimeDays * 0.5;
  }
}
