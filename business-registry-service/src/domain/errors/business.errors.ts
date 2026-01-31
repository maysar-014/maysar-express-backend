/**
 * Business Domain Errors
 * Custom error classes for business-related domain exceptions
 */

/**
 * Base error for business validation failures
 */
export class BusinessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessValidationError';
  }
}

/**
 * Error for when a business already exists
 */
export class BusinessAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessAlreadyExistsError';
  }
}

/**
 * Error for when a business is not found
 */
export class BusinessNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessNotFoundError';
  }
}

/**
 * Error for invalid registration number
 */
export class InvalidRegistrationNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRegistrationNumberError';
  }
}

/**
 * Error for when business is suspended
 */
export class BusinessSuspendedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessSuspendedError';
  }
}

/**
 * Error for unauthorized business operations
 */
export class UnauthorizedBusinessOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedBusinessOperationError';
  }
}
