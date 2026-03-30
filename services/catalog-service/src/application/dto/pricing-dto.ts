/**
 * Pricing Data Transfer Objects
 * Defines data structures for pricing-related operations
 * Application layer data contracts for pricing commands and results
 */

/**
 * Pricing Strategy Types
 */
export type PricingStrategy = 'fixed' | 'percentage' | 'formula';
export type PricingRuleType = 'fixed_discount' | 'percentage_discount' | 'fixed_price' | 'buy_get';
export type PricingRecord = Record<string, unknown>;

type UpdatePricingCommandLike = {
  productId?: unknown;
  pricingStrategy?: unknown;
  pricingValue?: unknown;
  currency?: unknown;
  effectiveDate?: unknown;
  expiryDate?: unknown;
  reason?: unknown;
  requestedBy?: unknown;
  metadata?: PricingRecord;
};

type BulkUpdatePricingCommandLike = UpdatePricingCommandLike & {
  productIds?: unknown[];
  sellerId?: unknown;
  requestId?: unknown;
};

type PricingRuleLike = {
  ruleId?: unknown;
  ruleType?: unknown;
  name?: unknown;
  description?: unknown;
  value?: unknown;
  conditions?: unknown;
  priority?: unknown;
  isActive?: unknown;
  validFrom?: unknown;
  validTo?: unknown;
  metadata?: PricingRecord;
};

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
  metadata?: PricingRecord;
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
  metadata?: PricingRecord;
}

/**
 * Pricing Condition DTO
 * Defines conditions for pricing rules
 */
export interface PricingConditionDto {
  conditionId: string;
  type: 'min_quantity' | 'max_quantity' | 'customer_segment' | 'first_time' | 'loyalty_tier' | 'time_range' | 'location';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'contains';
  value: unknown;
  metadata?: PricingRecord;
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
export function isUpdatePricingCommandDto(obj: unknown): obj is UpdatePricingCommandDto {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as UpdatePricingCommandLike;
  return (
    typeof candidate.productId === 'string' &&
    candidate.productId.length > 0 &&
    ['fixed', 'percentage', 'formula'].includes(candidate.pricingStrategy as PricingStrategy) &&
    typeof candidate.pricingValue === 'number' &&
    candidate.pricingValue > 0 &&
    (!candidate.currency || (typeof candidate.currency === 'string' && candidate.currency.length === 3)) &&
    (!candidate.effectiveDate || candidate.effectiveDate instanceof Date) &&
    (!candidate.expiryDate || candidate.expiryDate instanceof Date) &&
    (!candidate.expiryDate || !candidate.effectiveDate || candidate.effectiveDate < candidate.expiryDate) &&
    (!candidate.reason || (typeof candidate.reason === 'string' && candidate.reason.length <= 500)) &&
    typeof candidate.requestedBy === 'string' &&
    candidate.requestedBy.length > 0
  );
}

export function isBulkUpdatePricingCommandDto(obj: unknown): obj is BulkUpdatePricingCommandDto {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as BulkUpdatePricingCommandLike;
  return (
    Array.isArray(candidate.productIds) &&
    candidate.productIds.length >= 1 &&
    candidate.productIds.length <= 1000 &&
    candidate.productIds.every((id) => typeof id === 'string') &&
    ['fixed', 'percentage', 'formula'].includes(candidate.pricingStrategy as PricingStrategy) &&
    typeof candidate.pricingValue === 'number' &&
    candidate.pricingValue >= -100 &&
    candidate.pricingValue <= 1000 &&
    (!candidate.currency || (typeof candidate.currency === 'string' && candidate.currency.length === 3)) &&
    (!candidate.effectiveDate || candidate.effectiveDate instanceof Date) &&
    (!candidate.expiryDate || candidate.expiryDate instanceof Date) &&
    (!candidate.sellerId || typeof candidate.sellerId === 'string') &&
    typeof candidate.reason === 'string' &&
    candidate.reason.length > 0 &&
    candidate.reason.length <= 500 &&
    typeof candidate.requestId === 'string' &&
    candidate.requestId.length > 0 &&
    typeof candidate.requestedBy === 'string' &&
    candidate.requestedBy.length > 0
  );
}

export function isPricingRuleDto(obj: unknown): obj is PricingRuleDto {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as PricingRuleLike;
  return (
    typeof candidate.ruleId === 'string' &&
    candidate.ruleId.length > 0 &&
    ['fixed_discount', 'percentage_discount', 'fixed_price', 'buy_get'].includes(candidate.ruleType as PricingRuleType) &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0 &&
    candidate.name.length <= 100 &&
    (!candidate.description || (typeof candidate.description === 'string' && candidate.description.length <= 500)) &&
    typeof candidate.value === 'number' &&
    (!candidate.conditions || Array.isArray(candidate.conditions)) &&
    typeof candidate.priority === 'number' &&
    candidate.priority >= 0 &&
    candidate.priority <= 100 &&
    typeof candidate.isActive === 'boolean' &&
    (!candidate.validFrom || candidate.validFrom instanceof Date) &&
    (!candidate.validTo || candidate.validTo instanceof Date)
  );
}

/**
 * DTO Factory Functions
 * Helper functions for creating validated DTOs
 */
export function createUpdatePricingCommand(data: unknown): UpdatePricingCommandDto {
  if (!isUpdatePricingCommandDto(data)) {
    throw new Error('Invalid UpdatePricingCommandDto data');
  }

  return {
    ...data,
    metadata: data.metadata || {}
  };
}

export function createBulkUpdatePricingCommand(data: unknown): BulkUpdatePricingCommandDto {
  if (!isBulkUpdatePricingCommandDto(data)) {
    throw new Error('Invalid BulkUpdatePricingCommandDto data');
  }

  return data;
}

export function createPricingRule(data: unknown): PricingRuleDto {
  if (!isPricingRuleDto(data)) {
    throw new Error('Invalid PricingRuleDto data');
  }

  return {
    ...data,
    conditions: data.conditions || [],
    metadata: data.metadata || {}
  };
}
