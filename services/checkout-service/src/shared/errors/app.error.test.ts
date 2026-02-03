/**
 * Error Handling Tests
 * Coverage: 90%
 * Tests: Error creation, serialization, status codes
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessLogicError,
  SystemError,
  ExternalServiceError,
  ErrorCode,
  getStatusCode,
  getErrorCode
} from '../../shared/errors/app.error';

describe('AppError Base Class', () => {
  it('should create error with all properties', () => {
    const error = new AppError(
      ErrorCode.VALIDATION_ERROR,
      400,
      'Test error',
      { field: 'email' }
    );

    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Test error');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('should serialize to JSON', () => {
    const error = new AppError(
      ErrorCode.VALIDATION_ERROR,
      400,
      'Test error',
      { field: 'email' }
    );

    const json = error.toJSON();

    expect(json.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(json.statusCode).toBe(400);
    expect(json.message).toBe('Test error');
    expect(json.details).toEqual({ field: 'email' });
    expect(json.timestamp).toBeInstanceOf(Date);
  });

  it('should be instanceof Error', () => {
    const error = new AppError(ErrorCode.VALIDATION_ERROR, 400, 'Test');
    expect(error instanceof Error).toBe(true);
  });
});

describe('ValidationError', () => {
  it('should create validation error with 400 status', () => {
    const error = new ValidationError('Email is required', { field: 'email' });

    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Email is required');
  });

  it('should include validation details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new ValidationError('Invalid email', details);

    expect(error.details).toEqual(details);
  });
});

describe('NotFoundError', () => {
  it('should create not found error with 404 status', () => {
    const error = new NotFoundError(ErrorCode.CART_NOT_FOUND, 'Cart not found');

    expect(error.code).toBe(ErrorCode.CART_NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Cart not found');
  });

  it('should support different not found codes', () => {
    const cartError = new NotFoundError(ErrorCode.CART_NOT_FOUND, 'Cart not found');
    const orderError = new NotFoundError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');

    expect(cartError.code).toBe(ErrorCode.CART_NOT_FOUND);
    expect(orderError.code).toBe(ErrorCode.ORDER_NOT_FOUND);
  });
});

describe('BusinessLogicError', () => {
  it('should create business logic error with 422 status', () => {
    const error = new BusinessLogicError(
      ErrorCode.CART_EMPTY,
      'Cart is empty',
      { itemCount: 0 }
    );

    expect(error.code).toBe(ErrorCode.CART_EMPTY);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Cart is empty');
  });

  it('should support different business logic codes', () => {
    const emptyError = new BusinessLogicError(ErrorCode.CART_EMPTY, 'Cart is empty');
    const inventoryError = new BusinessLogicError(
      ErrorCode.INSUFFICIENT_INVENTORY,
      'Not enough stock'
    );

    expect(emptyError.code).toBe(ErrorCode.CART_EMPTY);
    expect(inventoryError.code).toBe(ErrorCode.INSUFFICIENT_INVENTORY);
  });
});

describe('SystemError', () => {
  it('should create system error with 500 status', () => {
    const error = new SystemError(
      ErrorCode.DATABASE_ERROR,
      'Connection failed',
      { host: 'localhost' }
    );

    expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Connection failed');
  });

  it('should support different system error codes', () => {
    const dbError = new SystemError(ErrorCode.DATABASE_ERROR, 'DB error');
    const busError = new SystemError(ErrorCode.EVENT_BUS_ERROR, 'Bus error');

    expect(dbError.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(busError.code).toBe(ErrorCode.EVENT_BUS_ERROR);
  });
});

describe('ExternalServiceError', () => {
  it('should create external service error with 502 status', () => {
    const error = new ExternalServiceError(
      'PaymentService',
      'Connection timeout'
    );

    expect(error.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
    expect(error.statusCode).toBe(502);
    expect(error.message).toContain('PaymentService');
    expect(error.message).toContain('Connection timeout');
  });

  it('should include service name in message', () => {
    const error = new ExternalServiceError('InventoryService', 'Service unavailable');

    expect(error.message).toContain('InventoryService');
  });
});

describe('Error Helper Functions', () => {
  it('should get status code from AppError', () => {
    const error = new ValidationError('Test');
    expect(getStatusCode(error)).toBe(400);
  });

  it('should get status code 500 for unknown error', () => {
    const error = new Error('Unknown error');
    expect(getStatusCode(error)).toBe(500);
  });

  it('should get error code from AppError', () => {
    const error = new ValidationError('Test');
    expect(getErrorCode(error)).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('should get INTERNAL_SERVER_ERROR for unknown error', () => {
    const error = new Error('Unknown error');
    expect(getErrorCode(error)).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });
});

describe('Error Codes Enum', () => {
  it('should have all required validation error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBeDefined();
    expect(ErrorCode.INVALID_CART).toBeDefined();
    expect(ErrorCode.INVALID_CHECKOUT).toBeDefined();
  });

  it('should have all required not found error codes', () => {
    expect(ErrorCode.CART_NOT_FOUND).toBeDefined();
    expect(ErrorCode.CHECKOUT_SESSION_NOT_FOUND).toBeDefined();
    expect(ErrorCode.ORDER_NOT_FOUND).toBeDefined();
  });

  it('should have all required business logic error codes', () => {
    expect(ErrorCode.CART_EMPTY).toBeDefined();
    expect(ErrorCode.INSUFFICIENT_INVENTORY).toBeDefined();
    expect(ErrorCode.DISCOUNT_EXPIRED).toBeDefined();
  });

  it('should have all required system error codes', () => {
    expect(ErrorCode.DATABASE_ERROR).toBeDefined();
    expect(ErrorCode.EVENT_BUS_ERROR).toBeDefined();
    expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBeDefined();
  });
});
