/**
 * Domain Services Index
 * Pure domain services that orchestrate domain logic
 * No external dependencies - pure business logic coordination
 */

// Export domain services as they are implemented
// This file serves as the entry point for domain services

export interface DomainService {
  readonly serviceName: string;
  execute(...args: any[]): Promise<any> | any;
}

/**
 * Base Domain Service
 * Provides common functionality for domain services
 */
export abstract class BaseDomainService implements DomainService {
  abstract readonly serviceName: string;

  abstract execute(...args: any[]): Promise<any> | any;

  protected validateBusinessRules(rules: Array<() => boolean | Error>): void {
    for (const rule of rules) {
      const result = rule();
      if (result instanceof Error) {
        throw result;
      }
    }
  }

  protected ensureInvariant(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Domain invariant violated: ${message}`);
    }
  }
}

/**
 * Service Result Pattern
 * Standardizes service operation results
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export function successResult<T>(data: T, metadata?: Record<string, any>): ServiceResult<T> {
  return { success: true, data, metadata };
}

export function failureResult(error: string, metadata?: Record<string, any>): ServiceResult {
  return { success: false, error, metadata };
}
