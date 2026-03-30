/**
 * Pricing Mapper
 * Bidirectional mapping for pricing-related operations
 * Handles pricing rules, calculations, and analytics transformations
 */

import {
  UpdatePricingCommandDto,
  BulkUpdatePricingCommandDto,
  PricingRuleDto,
  CalculatePriceRequestDto,
  CalculatePriceResultDto,
  UpdatePricingResultDto,
  BulkUpdatePricingResultDto,
  PricingAnalyticsDto
} from '../dto/pricing-dto';

type PricingRuleDomain = Omit<PricingRuleDto, 'metadata'> & {
  metadata?: Record<string, unknown>;
};

type CalculatePriceRequestDomain = {
  productId: string;
  basePrice: number;
  pricingRules: PricingRuleDomain[];
  customerContext?: CalculatePriceRequestDto['customerContext'];
  context?: CalculatePriceRequestDto['context'];
};

/**
 * Pricing Mapper
 * Handles transformations between pricing domain objects and DTOs
 * Includes validation and performance optimizations
 */
export class PricingMapper {
  private static requireObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} is invalid`);
    }

    return value as Record<string, unknown>;
  }

  /**
   * Map pricing rule DTO to domain pricing rule
   */
  static ruleDtoToDomain(dto: PricingRuleDto): PricingRuleDomain {
    const input = this.requireObject(dto, 'Pricing rule DTO') as unknown as PricingRuleDto;

    return {
      ruleId: input.ruleId,
      ruleType: input.ruleType,
      name: input.name,
      description: input.description,
      value: input.value,
      conditions: input.conditions,
      priority: input.priority,
      isActive: input.isActive,
      validFrom: input.validFrom,
      validTo: input.validTo
    };
  }

  /**
   * Map domain pricing rule to DTO
   */
  static ruleDomainToDto(domain: unknown): PricingRuleDto {
    const input = this.requireObject(domain, 'Pricing rule') as Partial<PricingRuleDto> & {
      metadata?: Record<string, unknown>;
    };

    if (typeof input.ruleId !== 'string' || typeof input.ruleType !== 'string' || typeof input.name !== 'string' || typeof input.value !== 'number' || typeof input.priority !== 'number') {
      throw new Error('Pricing rule is invalid');
    }

    return {
      ruleId: input.ruleId as string,
      ruleType: input.ruleType as PricingRuleDto['ruleType'],
      name: input.name as string,
      description: typeof input.description === 'string' ? input.description : undefined,
      value: input.value as number,
      conditions: Array.isArray(input.conditions) ? input.conditions : undefined,
      priority: input.priority as number,
      isActive: Boolean(input.isActive),
      validFrom: input.validFrom as Date | undefined,
      validTo: input.validTo as Date | undefined,
      metadata: (input.metadata as PricingRuleDto['metadata']) ?? {}
    };
  }

  /**
   * Map price calculation request to domain format
   */
  static calculatePriceRequestToDomain(dto: CalculatePriceRequestDto): CalculatePriceRequestDomain {
    const input = this.requireObject(dto, 'Pricing calculation request') as unknown as CalculatePriceRequestDto;

    return {
      productId: input.productId,
      basePrice: input.basePrice,
      pricingRules: Array.isArray(input.pricingRules) ? input.pricingRules.map(rule => this.ruleDtoToDomain(rule as PricingRuleDto)) : [],
      customerContext: input.customerContext,
      context: input.context
    };
  }

  /**
   * Map price calculation result to DTO
   */
  static calculatePriceResultToDto(domain: unknown): CalculatePriceResultDto {
    const input = this.requireObject(domain, 'Pricing calculation result') as unknown as CalculatePriceResultDto;

    return {
      productId: input.productId,
      basePrice: input.basePrice,
      finalPrice: input.finalPrice,
      currency: input.currency,
      appliedRules: input.appliedRules,
      totalDiscount: input.totalDiscount,
      totalDiscountPercent: input.totalDiscountPercent,
      breakdown: input.breakdown,
      metadata: input.metadata
    };
  }

  /**
   * Map pricing update result to DTO
   */
  static updatePricingResultToDto(domain: unknown): UpdatePricingResultDto {
    const input = this.requireObject(domain, 'Pricing update result') as unknown as UpdatePricingResultDto;

    return {
      productId: input.productId,
      success: input.success,
      previousPrice: input.previousPrice,
      newPrice: input.newPrice,
      changeAmount: input.changeAmount,
      changePercent: input.changePercent,
      pricingStrategy: input.pricingStrategy,
      effectiveDate: input.effectiveDate,
      expiryDate: input.expiryDate,
      updatedAt: input.updatedAt,
      updatedBy: input.updatedBy,
      reason: input.reason,
      validationResults: input.validationResults
    };
  }

  /**
   * Map bulk pricing update result to DTO
   */
  static bulkUpdatePricingResultToDto(domain: unknown): BulkUpdatePricingResultDto {
    const input = this.requireObject(domain, 'Bulk pricing update result') as unknown as BulkUpdatePricingResultDto;

    return {
      operationId: input.operationId,
      totalProducts: input.totalProducts,
      successfulUpdates: input.successfulUpdates,
      failedUpdates: input.failedUpdates,
      skippedProducts: input.skippedProducts,
      pricingStrategy: input.pricingStrategy,
      pricingValue: input.pricingValue,
      results: input.results.map(result => this.updatePricingResultToDto(result)),
      errors: input.errors,
      warnings: input.warnings,
      pricingImpact: input.pricingImpact,
      metadata: input.metadata
    };
  }

  /**
   * Map pricing analytics to DTO
   */
  static pricingAnalyticsToDto(domain: unknown): PricingAnalyticsDto {
    const input = this.requireObject(domain, 'Pricing analytics') as unknown as PricingAnalyticsDto;

    return {
      period: input.period,
      summary: input.summary,
      rulePerformance: input.rulePerformance,
      strategyBreakdown: input.strategyBreakdown,
      temporalTrends: input.temporalTrends
    };
  }

  /**
   * Batch mapping for pricing rules
   */
  static rulesToDtoBatch(domainRules: unknown[]): PricingRuleDto[] {
    return domainRules.map(rule => this.ruleDomainToDto(rule));
  }

  /**
   * Batch mapping for pricing results
   */
  static pricingResultsToDtoBatch(domainResults: unknown[]): CalculatePriceResultDto[] {
    return domainResults.map(result => this.calculatePriceResultToDto(result));
  }

  /**
   * Validate pricing command DTO
   */
  static validateUpdatePricingCommand(dto: UpdatePricingCommandDto): boolean {
    return !!(dto.productId && dto.pricingStrategy && typeof dto.pricingValue === 'number' && dto.pricingValue > 0 && dto.requestedBy);
  }

  /**
   * Validate bulk pricing command DTO
   */
  static validateBulkUpdatePricingCommand(dto: BulkUpdatePricingCommandDto): boolean {
    return !!(
      Array.isArray(dto.productIds) &&
      dto.productIds.length > 0 &&
      dto.pricingStrategy &&
      typeof dto.pricingValue === 'number' &&
      dto.pricingValue >= -100 &&
      dto.pricingValue <= 1000 &&
      dto.reason &&
      dto.requestId &&
      dto.requestedBy
    );
  }

  /**
   * Validate pricing rule DTO
   */
  static validatePricingRule(dto: PricingRuleDto): boolean {
    return !!(
      dto.ruleId &&
      dto.ruleType &&
      dto.name &&
      typeof dto.value === 'number' &&
      typeof dto.priority === 'number' &&
      dto.priority >= 0 &&
      dto.priority <= 100
    );
  }
}

/**
 * Pricing Mapper Utilities
 */
export const pricingMappers = {
  /**
   * Map pricing rules batch
   */
  rulesToDtoBatch: PricingMapper.rulesToDtoBatch,

  /**
   * Map pricing results batch
   */
  pricingResultsToDtoBatch: PricingMapper.pricingResultsToDtoBatch,

  /**
   * Validate pricing commands
   */
  validateUpdateCommand: PricingMapper.validateUpdatePricingCommand,
  validateBulkUpdateCommand: PricingMapper.validateBulkUpdatePricingCommand,
  validatePricingRule: PricingMapper.validatePricingRule,

  /**
   * Individual mappers
   */
  ruleToDomain: PricingMapper.ruleDtoToDomain,
  ruleToDto: PricingMapper.ruleDomainToDto,
  calculatePriceRequestToDomain: PricingMapper.calculatePriceRequestToDomain,
  calculatePriceResultToDto: PricingMapper.calculatePriceResultToDto,
  updatePricingResultToDto: PricingMapper.updatePricingResultToDto,
  bulkUpdatePricingResultToDto: PricingMapper.bulkUpdatePricingResultToDto,
  pricingAnalyticsToDto: PricingMapper.pricingAnalyticsToDto
};
