/**
 * Application Layer Index
 * Central export point for the Application Layer
 * Orchestrates domain objects to fulfill business use cases
 */

// Use Cases - Business operation orchestrators
export * from './use-cases';

// DTOs - Data transfer objects
export * from './dto';

// Mappers - Domain ↔ DTO conversion
export * from './mappers';

// Sagas - Long-running business process orchestrators
export * from './sagas';

// Handlers - Application event handlers
export * from './handlers';

/**
 * Application Layer Architecture Overview
 *
 * The Application Layer is responsible for:
 * 1. Orchestrating Domain objects to fulfill business use cases
 * 2. Coordinating between multiple domain objects and services
 * 3. Managing application state and workflows
 * 4. Handling cross-cutting concerns (logging, validation, etc.)
 * 5. Providing clean interfaces for external systems (API, UI, etc.)
 *
 * Key Principles:
 * - Thin layer that delegates to Domain logic
 * - No business rules - only coordination
 * - Dependency injection for infrastructure services
 * - Transaction management and error handling
 * - Request/response transformation
 *
 * Layer Boundaries:
 * - Knows about: Domain Layer (orchestrates)
 * - Does not know about: Infrastructure, Presentation layers
 * - Communicates via: Domain interfaces, DTOs
 */

/**
 * Application Service Interface
 * Defines the contract for application services
 */
export interface ApplicationService {
  readonly serviceName: string;
  execute(request: any, context?: any): Promise<any>;
}

/**
 * Base Application Service
 * Provides common functionality for application services
 */
export abstract class BaseApplicationService implements ApplicationService {
  abstract readonly serviceName: string;

  abstract execute(request: any, context?: any): Promise<any>;

  protected validateRequest<T>(request: T, validator: (req: T) => boolean): void {
    if (!validator(request)) {
      throw new Error(`Invalid request for ${this.serviceName}`);
    }
  }

  protected createSuccessResponse<T>(data: T, metadata?: any): any {
    return {
      success: true,
      data,
      metadata: {
        service: this.serviceName,
        timestamp: new Date(),
        ...metadata
      }
    };
  }

  protected createErrorResponse(error: string, code?: string, metadata?: any): any {
    return {
      success: false,
      error: {
        message: error,
        code: code || 'APPLICATION_ERROR'
      },
      metadata: {
        service: this.serviceName,
        timestamp: new Date(),
        ...metadata
      }
    };
  }
}

/**
 * Application Context
 * Provides context information for application operations
 */
export interface ApplicationContext {
  userId?: string;
  sessionId?: string;
  requestId: string;
  correlationId?: string;
  timestamp: Date;
  source: string;
  permissions?: string[];
  tenantId?: string;
  locale?: string;
  timezone?: string;
}

/**
 * Application Configuration
 * Configuration options for application layer behavior
 */
export interface ApplicationConfig {
  // Use case timeouts
  useCaseTimeout: number; // milliseconds

  // Caching configuration
  enableCaching: boolean;
  cacheTtl: number; // seconds

  // Validation configuration
  strictValidation: boolean;
  enableBusinessRules: boolean;

  // Monitoring configuration
  enableMetrics: boolean;
  enableTracing: boolean;

  // Circuit breaker configuration
  circuitBreakerEnabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;

  // Saga configuration
  sagaTimeout: number;
  maxRetryAttempts: number;
}

/**
 * Default Application Configuration
 */
export const DEFAULT_APPLICATION_CONFIG: ApplicationConfig = {
  useCaseTimeout: 30000, // 30 seconds
  enableCaching: true,
  cacheTtl: 300, // 5 minutes
  strictValidation: true,
  enableBusinessRules: true,
  enableMetrics: true,
  enableTracing: true,
  circuitBreakerEnabled: true,
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  sagaTimeout: 300000, // 5 minutes
  maxRetryAttempts: 3
};

/**
 * Application Layer Health Check
 * Verifies that all application services are properly configured
 */
export interface ApplicationHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    useCases: boolean;
    sagas: boolean;
    handlers: boolean;
    dtos: boolean;
  };
  dependencies: {
    domain: boolean;
    infrastructure: boolean;
  };
  lastChecked: Date;
  details?: Record<string, any>;
}

/**
 * Application Metrics
 * Performance and usage metrics for the application layer
 */
export interface ApplicationMetrics {
  useCaseExecutions: {
    total: number;
    successful: number;
    failed: number;
    averageExecutionTime: number;
  };
  sagaExecutions: {
    total: number;
    completed: number;
    failed: number;
    compensated: number;
  };
  cacheHits: number;
  cacheMisses: number;
  circuitBreakerTrips: number;
  timestamp: Date;
}

/**
 * Application Layer Bootstrap
 * Initializes the application layer with required dependencies
 */
export interface ApplicationBootstrap {
  initialize(config?: Partial<ApplicationConfig>): Promise<void>;
  registerUseCases(useCaseFactory: any): void;
  registerSagas(sagaFactory: any): void;
  registerHandlers(handlerFactory: any): void;
  getHealthCheck(): Promise<ApplicationHealthCheck>;
  getMetrics(): ApplicationMetrics;
  shutdown(): Promise<void>;
}

/**
 * Application Error Types
 * Standardized error types for application layer
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleViolationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_RULE_VIOLATION', 409, details);
    this.name = 'BusinessRuleViolationError';
  }
}

export class ResourceNotFoundError extends ApplicationError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 'RESOURCE_NOT_FOUND', 404);
    this.name = 'ResourceNotFoundError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ServiceUnavailableError extends ApplicationError {
  constructor(service: string) {
    super(`${service} is currently unavailable`, 'SERVICE_UNAVAILABLE', 503);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Application Constants
 */
export const APPLICATION_CONSTANTS = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_SEARCH_QUERY_LENGTH: 200,
  MAX_TAGS_PER_PRODUCT: 20,
  MAX_DESCRIPTION_LENGTH: 5000,
  CACHE_TTL_DEFAULT: 300, // 5 minutes
  REQUEST_TIMEOUT_DEFAULT: 30000, // 30 seconds
  SAGA_TIMEOUT_DEFAULT: 300000, // 5 minutes
} as const;
