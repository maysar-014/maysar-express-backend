/**
 * Pricing Mapper
 * Bidirectional mapping for pricing-related operations
 * Handles pricing rules, calculations, and analytics transformations
 */

import { Price } from '../../domain/value-objects/monetary.value-object';
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

/**
 * Pricing Mapper
 * Handles transformations between pricing domain objects and DTOs
 * Includes validation and performance optimizations
 */
export class PricingMapper {
  /**
   * Map pricing rule DTO to domain pricing rule
   */
  static ruleDtoToDomain(dto: PricingRuleDto): any {
    return {
      ruleId: dto.ruleId,
      ruleType: dto.ruleType,
      name: dto.name,
      description: dto.description,
      value: dto.value,
      conditions: dto.conditions,
      priority: dto.priority,
      isActive: dto.isActive,
      validFrom: dto.validFrom,
      validTo: dto.validTo
    };
  }

  /**
   * Map domain pricing rule to DTO
   */
  static ruleDomainToDto(domain: any): PricingRuleDto {
    return {
      ruleId: domain.ruleId,
      ruleType: domain.ruleType,
      name: domain.name,
      description: domain.description,
      value: domain.value,
      conditions: domain.conditions,
      priority: domain.priority,
      isActive: domain.isActive,
      validFrom: domain.validFrom,
      validTo: domain.validTo,
      metadata: domain.metadata
    };
  }

  /**
   * Map price calculation request to domain format
   */
  static calculatePriceRequestToDomain(dto: CalculatePriceRequestDto): any {
    return {
      productId: dto.productId,
      basePrice: dto.basePrice,
      pricingRules: dto.pricingRules.map(rule => this.ruleDtoToDomain(rule)),
      customerContext: dto.customerContext,
      context: dto.context
    };
  }

  /**
   * Map price calculation result to DTO
   */
  static calculatePriceResultToDto(domain: any): CalculatePriceResultDto {
    return {
      productId: domain.productId,
      basePrice: domain.basePrice,
      finalPrice: domain.finalPrice,
      currency: domain.currency,
      appliedRules: domain.appliedRules,
      totalDiscount: domain.totalDiscount,
      totalDiscountPercent: domain.totalDiscountPercent,
      breakdown: domain.breakdown,
      metadata: domain.metadata
    };
  }

  /**
   * Map pricing update result to DTO
   */
  static updatePricingResultToDto(domain: any): UpdatePricingResultDto {
    return {
      productId: domain.productId,
      success: domain.success,
      previousPrice: domain.previousPrice,
      newPrice: domain.newPrice,
      changeAmount: domain.changeAmount,
      changePercent: domain.changePercent,
      pricingStrategy: domain.pricingStrategy,
      effectiveDate: domain.effectiveDate,
      expiryDate: domain.expiryDate,
      updatedAt: domain.updatedAt,
      updatedBy: domain.updatedBy,
      reason: domain.reason,
      validationResults: domain.validationResults
    };
  }

  /**
   * Map bulk pricing update result to DTO
   */
  static bulkUpdatePricingResultToDto(domain: any): BulkUpdatePricingResultDto {
    return {
      operationId: domain.operationId,
      totalProducts: domain.totalProducts,
      successfulUpdates: domain.successfulUpdates,
      failedUpdates: domain.failedUpdates,
      skippedProducts: domain.skippedProducts,
      pricingStrategy: domain.pricingStrategy,
      pricingValue: domain.pricingValue,
      results: domain.results.map((result: any) => this.updatePricingResultToDto(result)),
      errors: domain.errors,
      warnings: domain.warnings,
      pricingImpact: domain.pricingImpact,
      metadata: domain.metadata
    };
  }

  /**
   * Map pricing analytics to DTO
   */
  static pricingAnalyticsToDto(domain: any): PricingAnalyticsDto {
    return {
      period: domain.period,
      summary: domain.summary,
      rulePerformance: domain.rulePerformance,
      strategyBreakdown: domain.strategyBreakdown,
      temporalTrends: domain.temporalTrends
    };
  }

  /**
   * Batch mapping for pricing rules
   */
  static rulesToDtoBatch(domainRules: any[]): PricingRuleDto[] {
    return domainRules.map(rule => this.ruleDomainToDto(rule));
  }

  /**
   * Batch mapping for pricing results
   */
  static pricingResultsToDtoBatch(domainResults: any[]): CalculatePriceResultDto[] {
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
