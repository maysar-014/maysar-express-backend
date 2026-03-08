import {
  DEFAULT_RETRY_OPTIONS,
  RetryPresets,
  RetryStats,
  createRetryableFunction,
  withRetry
} from './retry.util';

describe('retry util', () => {
  it('uses default retry condition for transient network and server errors', () => {
    const condition = DEFAULT_RETRY_OPTIONS.retryCondition!;

    expect(condition({ code: 'ECONNRESET' })).toBe(true);
    expect(condition({ code: 'ETIMEDOUT' })).toBe(true);
    expect(condition({ code: 'ENOTFOUND' })).toBe(true);
    expect(condition({ status: 502 })).toBe(true);
    expect(condition({ status: 404 })).toBe(false);
    expect(condition('boom')).toBe(false);
  });

  it('retries until success and reports attempt metadata', async () => {
    const onRetry = jest.fn();
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw { code: 'ETIMEDOUT' };
        }
        return 'ok';
      },
      {
        maxAttempts: 3,
        baseDelay: 0,
        maxDelay: 0,
        backoffFactor: 2,
        onRetry
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: 'ok',
        attempts: 3
      })
    );
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('returns failure when retry condition blocks retries', async () => {
    const result = await withRetry(
      async () => {
        throw { code: 'VALIDATION_ERROR' };
      },
      {
        maxAttempts: 4,
        baseDelay: 0,
        maxDelay: 0,
        backoffFactor: 2,
        retryCondition: () => false
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ code: 'VALIDATION_ERROR' });
    expect(result.attempts).toBe(4);
  });

  it('creates retryable function wrappers that preserve args and throw on terminal failure', async () => {
    const fn = jest.fn(async (value: number) => {
      if (value < 0) {
        throw new Error('negative');
      }
      return value * 2;
    });

    const wrapped = createRetryableFunction(fn, {
      maxAttempts: 2,
      baseDelay: 0,
      maxDelay: 0,
      backoffFactor: 2,
      retryCondition: () => true
    });

    await expect(wrapped(3)).resolves.toBe(6);
    await expect(wrapped(-1)).rejects.toThrow('negative');
  });

  it('tracks retry statistics and supports reset', () => {
    const stats = new RetryStats();

    stats.recordRetry('publish-event', true, 3);
    stats.recordRetry('publish-event', false, 2);

    const publishStats = stats.getStats('publish-event');
    expect(publishStats.totalAttempts).toBe(5);
    expect(publishStats.successfulRetries).toBe(1);
    expect(publishStats.failedRetries).toBe(1);
    expect(publishStats.averageAttempts).toBe(2.5);
    expect(publishStats.lastFailure).toBeInstanceOf(Date);
    expect(Object.keys(stats.getAllStats())).toEqual(['publish-event']);

    stats.reset();
    expect(stats.getStats('publish-event')).toEqual({
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      lastFailure: null
    });
  });

  it('includes expected retry presets for network operations', () => {
    expect(RetryPresets.NETWORK.maxAttempts).toBe(5);
    expect(RetryPresets.NETWORK.retryCondition({ code: 'ECONNREFUSED' })).toBe(true);
    expect(RetryPresets.NETWORK.retryCondition({ status: 500 })).toBe(true);
    expect(RetryPresets.NETWORK.retryCondition({ status: 400 })).toBe(false);
  });
});
