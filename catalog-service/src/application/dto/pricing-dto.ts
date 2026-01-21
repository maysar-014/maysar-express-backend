/**
 * Pricing Data Transfer Objects
 * Defines data structures for pricing-related operations
 * Application layer data contracts for pricing commands and results
 */

import { z } from 'zod'; // Assuming Zod for validation schemas

/**
 * Pricing Strategy Types
 */
export type PricingStrategy = 'fixed' | 'percentage' | 'formula';
export type PricingRuleType = 'fixed_discount' | 'percentage_discount' | 'fixed_price' | 'buy_get';

/**
 * Price Update Command DTO
 * Input contract for updating product pricing
 */
export interface UpdatePricingCommandDto {
  productId: string;
  pricingStrategy: PricingStrategy;
  pricingValue: number;
  currency?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  reason?: string;
  requestedBy: string;
  metadata?: Record<string, any>;
}

/**
 * Bulk Price Update Command DTO
 * Input contract for bulk pricing operations
 */
export interface BulkUpdatePricingCommandDto {
  productIds: string[];
  pricingStrategy: PricingStrategy;
  pricingValue: number;
  currency?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  sellerId?: string;
  reason: string;
  validateBusinessRules?: boolean;
  notifyStakeholders?: boolean;
  requestId: string;
  requestedBy: string;
}

/**
 * Pricing Rule Definition DTO
 * Data contract for defining pricing rules
 */
export interface PricingRuleDto {
  ruleId: string;
  ruleType: PricingRuleType;
  name: string;
  description?: string;
  value: number;
  conditions?: PricingConditionDto[];
  priority: number;
  isActive: boolean;
  validFrom?: Date;
  validTo?: Date;
  metadata?: Record<string, any>;
}

/**
 * Pricing Condition DTO
 * Defines conditions for pricing rules
 */
export interface PricingConditionDto {
  conditionId: string;
  type: 'min_quantity' | 'max_quantity' | 'customer_segment' | 'first_time' | 'loyalty_tier' | 'time_range' | 'location';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'contains';
  value: any;
  metadata?: Record<string, any>;
}

/**
 * Campaign Pricing Rule DTO
 * Specialized pricing rules for promotional campaigns
 */
export interface CampaignPricingRuleDto extends PricingRuleDto {
  campaignId: string;
  campaignName: string;
  campaignType: 'discount' | 'promotion' | 'clearance' | 'seasonal';
  targetProducts: string[];
  targetCategories?: string[];
  autoApply: boolean;
  autoRevert: boolean;
}

/**
 * Price Calculation Request DTO
 * Input for price calculation operations
 */
export interface CalculatePriceRequestDto {
  productId: string;
  basePrice: number;
  pricingRules: PricingRuleDto[];
  customerContext?: {
    customerId?: string;
    segment?: string;
    loyaltyTier?: string;
    location?: {
      country: string;
      region?: string;
      city?: string;
    };
    purchaseHistory?: {
      totalOrders: number;
      totalSpent: number;
      lastOrderDate?: Date;
      isFirstTime: boolean;
    };
  };
  context?: {
    quantity?: number;
    couponCode?: string;
    referralCode?: string;
    campaignId?: string;
  };
}

/**
 * Price Calculation Result DTO
 * Output contract for price calculations
 */
export interface CalculatePriceResultDto {
  productId: string;
  basePrice: number;
  finalPrice: number;
  currency: string;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountAmount: number;
    discountPercent: number;
    priority: number;
  }>;
  totalDiscount: number;
  totalDiscountPercent: number;
  breakdown: {
    originalPrice: number;
    discounts: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    taxes?: Array<{
      type: string;
      amount: number;
      rate: number;
    }>;
    fees?: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  };
  metadata: {
    calculationId: string;
    calculatedAt: Date;
    calculationTime: number;
    rulesApplied: number;
  };
}

/**
 * Price Update Result DTO
 * Output contract for pricing update operations
 */
export interface UpdatePricingResultDto {
  productId: string;
  success: boolean;
  previousPrice: {
    amount: number;
    currency: string;
  };
  newPrice: {
    amount: number;
    currency: string;
  };
  changeAmount: number;
  changePercent: number;
  pricingStrategy: PricingStrategy;
  effectiveDate?: Date;
  expiryDate?: Date;
  updatedAt: Date;
  updatedBy: string;
  reason?: string;
  validationResults?: {
    businessRulesPassed: boolean;
    warnings: string[];
    errors: string[];
  };
}

/**
 * Bulk Pricing Update Result DTO
 * Output contract for bulk pricing operations
 */
export interface BulkUpdatePricingResultDto {
  operationId: string;
  totalProducts: number;
  successfulUpdates: number;
  failedUpdates: number;
  skippedProducts: number;
  pricingStrategy: PricingStrategy;
  pricingValue: number;
  results: UpdatePricingResultDto[];
  errors: Array<{
    productId: string;
    error: string;
    errorCode: string;
  }>;
  warnings: Array<{
    productId: string;
    warning: string;
    warningCode: string;
  }>;
  pricingImpact: {
    totalRevenueChange: number;
    averagePriceChangePercent: number;
    productsAffected: number;
  };
  metadata: {
    operationId: string;
    startedAt: Date;
    completedAt: Date;
    executionTime: number;
    requestId: string;
    requestedBy: string;
  };
}

/**
 * Pricing Validation Request DTO
 * Input contract for pricing validation operations
 */
export interface ValidatePricingRequestDto {
  productId?: string;
  pricingRules: PricingRuleDto[];
  testCases: Array<{
    scenarioId: string;
    basePrice: number;
    customerContext?: CalculatePriceRequestDto['customerContext'];
    expectedPrice?: number;
    expectedDiscount?: number;
  }>;
}

/**
 * Pricing Validation Result DTO
 * Output contract for pricing validation results
 */
export interface ValidatePricingResultDto {
  isValid: boolean;
  validationErrors: Array<{
    ruleId: string;
    scenarioId: string;
    error: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  testResults: Array<{
    scenarioId: string;
    expectedPrice?: number;
    actualPrice: number;
    expectedDiscount?: number;
    actualDiscount: number;
    passed: boolean;
    appliedRules: string[];
  }>;
  ruleAnalysis: Array<{
    ruleId: string;
    ruleName: string;
    conflicts: string[];
    coverage: number; // percentage of test cases affected
    effectiveness: number; // average discount percentage
  }>;
  recommendations: Array<{
    type: 'optimization' | 'conflict_resolution' | 'coverage_improvement';
    message: string;
    affectedRules: string[];
    impact: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Pricing Analytics DTO
 * Data contract for pricing performance analytics
 */
export interface PricingAnalyticsDto {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalProducts: number;
    totalPriceChanges: number;
    averagePriceChangePercent: number;
    totalRevenueImpact: number;
    mostUsedStrategy: PricingStrategy;
  };
  rulePerformance: Array<{
    ruleId: string;
    ruleName: string;
    usageCount: number;
    averageDiscount: number;
    revenueImpact: number;
    conversionRate?: number;
  }>;
  strategyBreakdown: Record<PricingStrategy, {
    usageCount: number;
    averageValue: number;
    totalImpact: number;
  }>;
  temporalTrends: Array<{
    date: string;
    priceChanges: number;
    revenueImpact: number;
    activeRules: number;
  }>;
}

/**
 * Pricing Policy DTO
 * Data contract for pricing policies and constraints
 */
export interface PricingPolicyDto {
  policyId: string;
  name: string;
  description: string;
  constraints: Array<{
    constraintId: string;
    type: 'max_discount_percent' | 'min_price' | 'max_price_change' | 'price_rounding' | 'margin_protection';
    value: number;
    unit?: string;
    appliesTo: 'all_products' | 'categories' | 'products' | 'sellers';
    targetIds?: string[];
  }>;
  isActive: boolean;
  priority: number;
  validFrom?: Date;
  validTo?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pricing Simulation Request DTO
 * Input contract for pricing scenario simulation
 */
export interface PricingSimulationRequestDto {
  productId: string;
  basePrice: number;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    pricingRules: PricingRuleDto[];
    customerContext?: CalculatePriceRequestDto['customerContext'];
  }>;
  comparison?: {
    baselineScenario?: string;
    metrics: Array<'final_price' | 'total_discount' | 'conversion_impact' | 'revenue_impact'>;
  };
}

/**
 * Pricing Simulation Result DTO
 * Output contract for pricing simulation results
 */
export interface PricingSimulationResultDto {
  productId: string;
  basePrice: number;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    finalPrice: number;
    totalDiscount: number;
    appliedRules: Array<{
      ruleId: string;
      discountAmount: number;
      discountPercent: number;
    }>;
    metrics: Record<string, number>;
  }>;
  comparison?: {
    baselineScenario: string;
    scenarioComparisons: Array<{
      scenarioId: string;
      priceDifference: number;
      discountDifference: number;
      metricDifferences: Record<string, number>;
      recommendation: 'better' | 'worse' | 'neutral';
    }>;
  };
  simulationMetadata: {
    simulationId: string;
    executedAt: Date;
    executionTime: number;
    scenariosTested: number;
  };
}

/**
 * Validation Functions
 * Runtime validation for DTOs using TypeScript type guards
 */

/**
 * Type guards for runtime type checking
 */
export function isUpdatePricingCommandDto(obj: any): obj is UpdatePricingCommandDto {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.productId === 'string' &&
    ['fixed', 'percentage', 'formula'].includes(obj.pricingStrategy) &&
    typeof obj.pricingValue === 'number' &&
    obj.pricingValue > 0 &&
    (!obj.currency || (typeof obj.currency === 'string' && obj.currency.length === 3)) &&
    (!obj.effectiveDate || obj.effectiveDate instanceof Date) &&
    (!obj.expiryDate || obj.expiryDate instanceof Date) &&
    (!obj.expiryDate || !obj.effectiveDate || obj.effectiveDate < obj.expiryDate) &&
    (!obj.reason || (typeof obj.reason === 'string' && obj.reason.length <= 500)) &&
    typeof obj.requestedBy === 'string' &&
    obj.requestedBy.length > 0
  );
}

export function isBulkUpdatePricingCommandDto(obj: any): obj is BulkUpdatePricingCommandDto {
  return (
    obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.productIds) &&
    obj.productIds.length >= 1 &&
    obj.productIds.length <= 1000 &&
    obj.productIds.every((id: any) => typeof id === 'string') &&
    ['fixed', 'percentage', 'formula'].includes(obj.pricingStrategy) &&
    typeof obj.pricingValue === 'number' &&
    obj.pricingValue >= -100 &&
    obj.pricingValue <= 1000 &&
    (!obj.currency || (typeof obj.currency === 'string' && obj.currency.length === 3)) &&
    (!obj.effectiveDate || obj.effectiveDate instanceof Date) &&
    (!obj.expiryDate || obj.expiryDate instanceof Date) &&
    (!obj.sellerId || typeof obj.sellerId === 'string') &&
    typeof obj.reason === 'string' &&
    obj.reason.length > 0 &&
    obj.reason.length <= 500 &&
    typeof obj.requestId === 'string' &&
    obj.requestId.length > 0 &&
    typeof obj.requestedBy === 'string' &&
    obj.requestedBy.length > 0
  );
}

export function isPricingRuleDto(obj: any): obj is PricingRuleDto {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.ruleId === 'string' &&
    obj.ruleId.length > 0 &&
    ['fixed_discount', 'percentage_discount', 'fixed_price', 'buy_get'].includes(obj.ruleType) &&
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    obj.name.length <= 100 &&
    (!obj.description || (typeof obj.description === 'string' && obj.description.length <= 500)) &&
    typeof obj.value === 'number' &&
    (!obj.conditions || Array.isArray(obj.conditions)) &&
    typeof obj.priority === 'number' &&
    obj.priority >= 0 &&
    obj.priority <= 100 &&
    typeof obj.isActive === 'boolean' &&
    (!obj.validFrom || obj.validFrom instanceof Date) &&
    (!obj.validTo || obj.validTo instanceof Date)
  );
}

/**
 * DTO Factory Functions
 * Helper functions for creating validated DTOs
 */
export function createUpdatePricingCommand(data: any): UpdatePricingCommandDto {
  if (!isUpdatePricingCommandDto(data)) {
    throw new Error('Invalid UpdatePricingCommandDto data');
  }

  return {
    ...data,
    metadata: data.metadata || {}
  };
}

export function createBulkUpdatePricingCommand(data: any): BulkUpdatePricingCommandDto {
  if (!isBulkUpdatePricingCommandDto(data)) {
    throw new Error('Invalid BulkUpdatePricingCommandDto data');
  }

  return data;
}

export function createPricingRule(data: any): PricingRuleDto {
  if (!isPricingRuleDto(data)) {
    throw new Error('Invalid PricingRuleDto data');
  }

  return {
    ...data,
    conditions: data.conditions || [],
    metadata: data.metadata || {}
  };
}
