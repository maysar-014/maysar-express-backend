import {
  DeliveryFailedError,
  NotificationNotFoundError,
  NotificationValidationError,
  PreferenceNotFoundError,
  RateLimitExceededError,
  TemplateNotFoundError
} from './notification.errors';

describe('notification domain errors', () => {
  const cases = [
    [NotificationValidationError, 'NotificationValidationError'],
    [NotificationNotFoundError, 'NotificationNotFoundError'],
    [TemplateNotFoundError, 'TemplateNotFoundError'],
    [PreferenceNotFoundError, 'PreferenceNotFoundError'],
    [RateLimitExceededError, 'RateLimitExceededError'],
    [DeliveryFailedError, 'DeliveryFailedError']
  ] as const;

  it.each(cases)('%s sets proper error name and message', (Ctor, expectedName) => {
    const err = new Ctor('test-message');

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('test-message');
    expect(err.name).toBe(expectedName);
  });
});
