/**
 * Notification Domain Errors
 */

export class NotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationValidationError';
  }
}

export class NotificationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationNotFoundError';
  }
}

export class TemplateNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateNotFoundError';
  }
}

export class PreferenceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreferenceNotFoundError';
  }
}

export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export class DeliveryFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeliveryFailedError';
  }
}
