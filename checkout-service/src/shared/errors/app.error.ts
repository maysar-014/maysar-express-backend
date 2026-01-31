/**
 * Error Handling Framework
 * Defines all custom exceptions and error codes
 */

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_CART = 'INVALID_CART',
  INVALID_CHECKOUT = 'INVALID_CHECKOUT',
  INVALID_DISCOUNT = 'INVALID_DISCOUNT',
  CART_NOT_FOUND = 'CART_NOT_FOUND',
  CHECKOUT_SESSION_NOT_FOUND = 'CHECKOUT_SESSION_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  CART_EMPTY = 'CART_EMPTY',
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  DISCOUNT_EXPIRED = 'DISCOUNT_EXPIRED',
  CHECKOUT_EXPIRED = 'CHECKOUT_EXPIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EVENT_BUS_ERROR = 'EVENT_BUS_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: Date;
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: new Date()
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, 400, message, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, 404, message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BusinessLogicError extends AppError {
  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(code, 422, message, details);
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

export class SystemError extends AppError {
  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(code, 500, message, details);
    Object.setPrototypeOf(this, SystemError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, 502, `${service}: ${message}`);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export function getStatusCode(error: AppError | Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

export function getErrorCode(error: AppError | Error): ErrorCode {
  if (error instanceof AppError) {
    return error.code;
  }
  return ErrorCode.INTERNAL_SERVER_ERROR;
}
