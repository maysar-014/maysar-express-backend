/**
 * Application Mappers Index
 * Central export point for all application layer mappers
 * Handles bidirectional transformations between domain and DTOs
 */

// Product Mappers
export * from './product-mapper';

// Pricing Mappers
export * from './pricing-mapper';

// Search Mappers
export * from './search-mapper';

/**
 * Common Mapper Patterns
 * Shared patterns and utilities for mappers
 */

/**
 * Mapper Interface
 * Contract for all mappers in the application layer
 */
export interface Mapper<TDomain, TDto> {
  toDomain(dto: TDto): TDomain;
  toDto(domain: TDomain): TDto;
  validate(dto: TDto): boolean;
}

/**
 * Batch Mapper Interface
 * Contract for mappers that support batch operations
 */
export interface BatchMapper<TDomain, TDto> extends Mapper<TDomain, TDto> {
  toDomainBatch(dtos: TDto[]): TDomain[];
  toDtoBatch(domains: TDomain[]): TDto[];
}



/**
 * Mapper Factory
 * Utility for creating configured mappers
 */
export class MapperFactory {
  /**
   * Create a mapper with validation
   */
  static createMapper<TDomain, TDto>(
    toDomainFn: (dto: TDto) => TDomain,
    toDtoFn: (domain: TDomain) => TDto,
    validateFn: (dto: TDto) => boolean
  ): Mapper<TDomain, TDto> {
    return {
      toDomain: toDomainFn,
      toDto: toDtoFn,
      validate: validateFn
    };
  }

  /**
   * Create a batch mapper with validation
   */
  static createBatchMapper<TDomain, TDto>(
    toDomainFn: (dto: TDto) => TDomain,
    toDtoFn: (domain: TDomain) => TDto,
    validateFn: (dto: TDto) => boolean,
    toDomainBatchFn: (dtos: TDto[]) => TDomain[],
    toDtoBatchFn: (domains: TDomain[]) => TDto[]
  ): BatchMapper<TDomain, TDto> {
    return {
      toDomain: toDomainFn,
      toDto: toDtoFn,
      validate: validateFn,
      toDomainBatch: toDomainBatchFn,
      toDtoBatch: toDtoBatchFn
    };
  }
}

/**
 * Common Mapping Utilities
 * Shared utility functions for mappers
 */
export class MappingUtils {
  /**
   * Safely map optional values
   */
  static mapOptional<T, U>(
    value: T | undefined | null,
    mapper: (val: T) => U
  ): U | undefined {
    return value ? mapper(value) : undefined;
  }

  /**
   * Map arrays with error handling
   */
  static mapArray<T, U>(
    items: T[],
    mapper: (item: T, index: number) => U,
    onError?: (error: Error, item: T, index: number) => void
  ): U[] {
    return items.map((item, index) => {
      try {
        return mapper(item, index);
      } catch (error) {
        if (onError && error instanceof Error) {
          onError(error, item, index);
        }
        throw error;
      }
    });
  }

  /**
   * Deep clone for mapping safety
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Validate required fields
   */
  static validateRequired<T>(
    value: T | undefined | null,
    fieldName: string
  ): T {
    if (value === undefined || value === null) {
      throw new Error(`${fieldName} is required`);
    }
    return value;
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    min?: number,
    max?: number
  ): string {
    if (min !== undefined && value.length < min) {
      throw new Error(`${fieldName} must be at least ${min} characters`);
    }
    if (max !== undefined && value.length > max) {
      throw new Error(`${fieldName} must be at most ${max} characters`);
    }
    return value;
  }

  /**
   * Validate numeric range
   */
  static validateNumericRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number
  ): number {
    if (min !== undefined && value < min) {
      throw new Error(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      throw new Error(`${fieldName} must be at most ${max}`);
    }
    return value;
  }
}
