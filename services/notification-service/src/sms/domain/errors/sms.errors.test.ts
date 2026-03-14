import {
  InvalidPhoneNumberError,
  InvalidStateTransitionError,
  MaxRetriesExceededError,
  MessageNotFoundError,
  MessageTooLongError,
  ProviderError,
  ProviderNotAvailableError,
  RateLimitExceededError,
  SmsError
} from './sms.errors';

describe('sms errors', () => {
  it('creates SmsError with proper name and message', () => {
    const error = new SmsError('base failure');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SmsError');
    expect(error.message).toBe('base failure');
  });

  it('formats InvalidPhoneNumberError with and without reason', () => {
    const withReason = new InvalidPhoneNumberError('+255700', 'country code invalid');
    const withoutReason = new InvalidPhoneNumberError('+255701');

    expect(withReason.message).toContain('country code invalid');
    expect(withoutReason.message).toBe('Invalid phone number: +255701');
  });

  it('formats MessageTooLongError and MessageNotFoundError messages', () => {
    const tooLong = new MessageTooLongError(350, 160);
    const notFound = new MessageNotFoundError('msg-1');

    expect(tooLong.message).toContain('350');
    expect(tooLong.message).toContain('160');
    expect(notFound.message).toBe('SMS message not found: msg-1');
  });

  it('preserves ProviderError metadata', () => {
    const error = new ProviderError('AfricasTalking', 'gateway timeout', '504', true);

    expect(error.message).toBe('AfricasTalking error: gateway timeout');
    expect(error.providerName).toBe('AfricasTalking');
    expect(error.statusCode).toBe('504');
    expect(error.isRetryable).toBe(true);
  });

  it('includes retry-after text and values in RateLimitExceededError', () => {
    const retryAfter = new Date('2026-03-09T00:00:00.000Z');
    const error = new RateLimitExceededError(20, 60000, retryAfter);

    expect(error.limit).toBe(20);
    expect(error.windowMs).toBe(60000);
    expect(error.retryAfter).toBe(retryAfter);
    expect(error.message).toContain('20 messages per 60 seconds');
    expect(error.message).toContain(retryAfter.toISOString());
  });

  it('formats InvalidStateTransitionError with optional reason', () => {
    const withReason = new InvalidStateTransitionError('QUEUED', 'SENT', 'message archived');
    const withoutReason = new InvalidStateTransitionError('QUEUED', 'SENT');

    expect(withReason.message).toBe('Invalid state transition from QUEUED to SENT: message archived');
    expect(withoutReason.message).toBe('Invalid state transition from QUEUED to SENT');
  });

  it('captures MaxRetriesExceededError and ProviderNotAvailableError details', () => {
    const retriesError = new MaxRetriesExceededError('msg-2', 4);
    const providerError = new ProviderNotAvailableError('AfricaTalking', 'maintenance');

    expect(retriesError.messageId).toBe('msg-2');
    expect(retriesError.retryCount).toBe(4);
    expect(retriesError.message).toContain('4 attempts');
    expect(providerError.providerName).toBe('AfricaTalking');
    expect(providerError.message).toContain('maintenance');
  });
});
