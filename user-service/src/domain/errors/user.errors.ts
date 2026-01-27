/**
 * User Domain Errors
 * Custom error classes for user-related domain exceptions
 */

/**
 * Base error for user validation failures
 */
export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserValidationError';
  }
}

/**
 * Error for when a user already exists
 */
export class UserAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAlreadyExistsError';
  }
}

/**
 * Error for when a user is not found
 */
export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Error for when user authentication fails
 */
export class UserAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAuthenticationError';
  }
}

/**
 * Error for when user authorization fails
 */
export class UserAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAuthorizationError';
  }
}

/**
 * Error for when user account is locked
 */
export class UserAccountLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAccountLockedError';
  }
}

/**
 * Error for when user account is suspended
 */
export class UserAccountSuspendedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAccountSuspendedError';
  }
}

/**
 * Error for when user account is inactive
 */
export class UserAccountInactiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAccountInactiveError';
  }
}

/**
 * Error for when user verification fails
 */
export class UserVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserVerificationError';
  }
}

/**
 * Error for when user business validation fails
 */
export class UserBusinessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserBusinessValidationError';
  }
}

/**
 * Error for when user risk assessment fails
 */
export class UserRiskAssessmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserRiskAssessmentError';
  }
}