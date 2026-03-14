/**
 * Domain Error Types
 * Comprehensive error classification for the Order Service
 */

export enum ErrorType {
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // Infrastructure Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Business Logic Errors
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',

  // Security Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // External Service Errors
  PESAPAL_ERROR = 'PESAPAL_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  userId?: string;
  orderId?: string;
  transactionId?: string;
  operation?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Base Application Error Class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
    isOperational: boolean = true,
    retryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.context = {
      timestamp: new Date(),
      ...context,
    };
    this.isOperational = isOperational;
    this.retryable = retryable;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      context: this.context,
      isOperational: this.isOperational,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.VALIDATION_ERROR, ErrorSeverity.LOW, context, true, false);
  }
}

export class BusinessRuleViolationError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.BUSINESS_RULE_VIOLATION, ErrorSeverity.MEDIUM, context, true, false);
  }
}

/**
 * Infrastructure Errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.DATABASE_ERROR, ErrorSeverity.HIGH, context, true, true);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.EXTERNAL_SERVICE_ERROR, ErrorSeverity.MEDIUM, context, true, true);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.NETWORK_ERROR, ErrorSeverity.MEDIUM, context, true, true);
  }
}

/**
 * Business Logic Errors
 */
export class InsufficientInventoryError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.INSUFFICIENT_INVENTORY, ErrorSeverity.MEDIUM, context, true, false);
  }
}

export class PaymentFailedError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.PAYMENT_FAILED, ErrorSeverity.HIGH, context, true, true);
  }
}

export class OrderNotFoundError extends AppError {
  constructor(orderId: string, context: Partial<ErrorContext> = {}) {
    super(`Order with ID ${orderId} not found`, ErrorType.ORDER_NOT_FOUND, ErrorSeverity.LOW, { ...context, orderId }, true, false);
  }
}

export class InvalidOrderStatusError extends AppError {
  constructor(currentStatus: string, requestedStatus: string, context: Partial<ErrorContext> = {}) {
    super(
      `Invalid status transition from ${currentStatus} to ${requestedStatus}`,
      ErrorType.INVALID_ORDER_STATUS,
      ErrorSeverity.MEDIUM,
      context,
      true,
      false
    );
  }
}

/**
 * Security Errors
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.UNAUTHORIZED, ErrorSeverity.MEDIUM, context, true, false);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.FORBIDDEN, ErrorSeverity.MEDIUM, context, true, false);
  }
}

export class RateLimitExceededError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.RATE_LIMIT_EXCEEDED, ErrorSeverity.LOW, context, true, false);
  }
}

/**
 * System Errors
 */
export class InternalError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.INTERNAL_ERROR, ErrorSeverity.HIGH, context, true, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.SERVICE_UNAVAILABLE, ErrorSeverity.HIGH, context, true, true);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string, operation: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.TIMEOUT_ERROR, ErrorSeverity.MEDIUM, { ...context, operation }, true, true);
  }
}

/**
 * External Service Errors
 */
export class PesapalError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.PESAPAL_ERROR, ErrorSeverity.MEDIUM, context, true, true);
  }
}

export class RedisError extends AppError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.REDIS_ERROR, ErrorSeverity.MEDIUM, context, true, true);
  }
}

/**
 * Error Factory Functions
 */
export const ErrorFactory = {
  validation: (message: string, context?: Partial<ErrorContext>) => new ValidationError(message, context),
  businessRule: (message: string, context?: Partial<ErrorContext>) => new BusinessRuleViolationError(message, context),
  database: (message: string, context?: Partial<ErrorContext>) => new DatabaseError(message, context),
  externalService: (message: string, context?: Partial<ErrorContext>) => new ExternalServiceError(message, context),
  network: (message: string, context?: Partial<ErrorContext>) => new NetworkError(message, context),
  insufficientInventory: (message: string, context?: Partial<ErrorContext>) => new InsufficientInventoryError(message, context),
  paymentFailed: (message: string, context?: Partial<ErrorContext>) => new PaymentFailedError(message, context),
  orderNotFound: (orderId: string, context?: Partial<ErrorContext>) => new OrderNotFoundError(orderId, context),
  invalidOrderStatus: (current: string, requested: string, context?: Partial<ErrorContext>) => new InvalidOrderStatusError(current, requested, context),
  unauthorized: (message?: string, context?: Partial<ErrorContext>) => new UnauthorizedError(message, context),
  forbidden: (message?: string, context?: Partial<ErrorContext>) => new ForbiddenError(message, context),
  rateLimitExceeded: (message?: string, context?: Partial<ErrorContext>) => new RateLimitExceededError(message, context),
  internal: (message: string, context?: Partial<ErrorContext>) => new InternalError(message, context),
  serviceUnavailable: (message?: string, context?: Partial<ErrorContext>) => new ServiceUnavailableError(message, context),
  timeout: (message: string, operation: string, context?: Partial<ErrorContext>) => new TimeoutError(message, operation, context),
  pesapal: (message: string, context?: Partial<ErrorContext>) => new PesapalError(message, context),
  redis: (message: string, context?: Partial<ErrorContext>) => new RedisError(message, context),
};

/**
 * Error Classification Helpers
 */
export function isRetryableError(error: AppError): boolean {
  return error.retryable;
}

export function isOperationalError(error: AppError): boolean {
  return error.isOperational;
}

export function getErrorSeverity(error: AppError): ErrorSeverity {
  return error.severity;
}

export function shouldAlert(error: AppError): boolean {
  return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL;
}

export function getErrorType(error: AppError): ErrorType {
  return error.type;
}


