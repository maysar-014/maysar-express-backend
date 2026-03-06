/**
 * Application Use Cases Index
 * Central export point for all application use cases
 * Pure orchestration logic - coordinates domain objects
 */

// Product Management Use Cases
export * from './create-product.use-case';
export * from './get-product.use-case';
export * from './search-products.use-case';
export * from './load-category-attributes.use-case';
export * from './preview-generated-description.use-case';

/**
 * Use Case Factory Interface
 * Defines contract for creating and configuring use cases
 * Infrastructure layer implements this to provide dependency injection
 */
export interface IUseCaseFactory {
  // Product Management
  createProductUseCase(): any;
  getProductUseCase(): any;
  getProductsBySellerUseCase(): any;
  searchProductsUseCase(): any;
  loadCategoryAttributesUseCase(): any;
  previewGeneratedDescriptionUseCase(): any;

  // Future use cases can be added here
  // updateProductUseCase(): any;
  // deleteProductUseCase(): any;
  // publishProductUseCase(): any;
  // manageInventoryUseCase(): any;
}

/**
 * Use Case Result Types
 * Common result patterns across all use cases
 */
export interface UseCaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export function successResult<T>(data: T, metadata?: Record<string, any>): UseCaseResult<T> {
  return { success: true, data, metadata };
}

export function failureResult(error: string, metadata?: Record<string, any>): UseCaseResult {
  return { success: false, error, metadata };
}

/**
 * Common Request/Response DTOs
 * Shared data transfer objects across use cases
 */
export interface PaginationRequest {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SortingRequest {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterRequest {
  [key: string]: any;
}

/**
 * Use Case Base Class
 * Provides common functionality for all use cases
 */
export abstract class BaseUseCase {
  protected validatePagination(pagination: PaginationRequest): string[] {
    const errors: string[] = [];

    if (pagination.page < 1) {
      errors.push('Page must be greater than 0');
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }

    return errors;
  }

  protected validateRequired(value: any, fieldName: string): string[] {
    const errors: string[] = [];

    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      errors.push(`${fieldName} is required`);
    }

    return errors;
  }

  protected validateId(id: string, fieldName: string = 'ID'): string[] {
    const errors: string[] = [];

    if (!id || typeof id !== 'string') {
      errors.push(`${fieldName} must be a valid string`);
    } else if (id.trim().length === 0) {
      errors.push(`${fieldName} cannot be empty`);
    }

    return errors;
  }

  protected createPaginationResponse(
    request: PaginationRequest,
    totalItems: number
  ): PaginationResponse {
    const totalPages = Math.ceil(totalItems / request.limit);

    return {
      page: request.page,
      limit: request.limit,
      total: totalItems,
      totalPages,
      hasNext: request.page < totalPages,
      hasPrev: request.page > 1
    };
  }
}
