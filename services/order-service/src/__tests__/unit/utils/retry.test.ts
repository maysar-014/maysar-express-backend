/**
 * Retry Utility Unit Tests
 * Testing exponential backoff retry functionality
 */

import { withRetry, RetryOptions, RetryPresets, retryStats } from '../../../utils/retry.util';

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, { maxAttempts: 4 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await withRetry(operation, { maxAttempts: 3 });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Always fails');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fails'));
      const delays: number[] = [];

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, 0);
      }) as any;

      try {
        await withRetry(operation, {
          maxAttempts: 4,
          baseDelay: 100,
          maxDelay: 1000
        });
      } catch {
        // Expected to fail
      }

      // Should have delays: 100ms, 200ms, 400ms
      expect(delays).toEqual([100, 200, 400]);

      global.setTimeout = originalSetTimeout;
    });

    it('should respect max delay limit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fails'));
      const delays: number[] = [];

      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, 0);
      }) as any;

      try {
        await withRetry(operation, {
          maxAttempts: 6,
          baseDelay: 100,
          maxDelay: 300
        });
      } catch {
        // Expected to fail
      }

      // Should cap at maxDelay: 100ms, 200ms, 300ms, 300ms, 300ms
      expect(delays).toEqual([100, 200, 300, 300, 300]);

      global.setTimeout = originalSetTimeout;
    });

    it('should retry only on specified errors', async () => {
      const retryCondition = (error: any) => error.message.includes('retryable');
      const operation = jest.fn().mockRejectedValue(new Error('non-retryable error'));

      const result = await withRetry(operation, {
        maxAttempts: 3,
        retryCondition
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // No retries
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on specified errors', async () => {
      const retryCondition = (error: any) => error.message.includes('retryable');
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('retryable error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, {
        maxAttempts: 3,
        retryCondition
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should execute onRetry callback', async () => {
      const onRetry = jest.fn();
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce('success');

      await withRetry(operation, {
        maxAttempts: 3,
        onRetry
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        1, // attempt number
        expect.any(Error),
        expect.any(Number) // delay
      );
    });
  });

  describe('Retry Configuration', () => {
    it('should use default configuration', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fails'));

      const startTime = Date.now();

      const result = await withRetry(operation);

      expect(result.attempts).toBe(3);
      expect(result.totalDuration).toBeGreaterThan(100); // Should have some delay
    });

    it('should accept custom configuration', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fails'));
      const config: Partial<RetryOptions> = {
        maxAttempts: 2,
        baseDelay: 50,
        maxDelay: 100,
        backoffFactor: 1.5,
        retryCondition: () => true,
        onRetry: jest.fn()
      };

      const result = await withRetry(operation, config);

      expect(result.attempts).toBe(2);
      expect(config.onRetry).toHaveBeenCalled();
    });
  });

  describe('Retry Presets', () => {
    it('should have FAST preset', () => {
      expect(RetryPresets.FAST.maxAttempts).toBe(3);
      expect(RetryPresets.FAST.baseDelay).toBe(100);
    });

    it('should have STANDARD preset', () => {
      expect(RetryPresets.STANDARD.maxAttempts).toBe(3);
      expect(RetryPresets.STANDARD.baseDelay).toBe(1000);
    });

    it('should have SLOW preset', () => {
      expect(RetryPresets.SLOW.maxAttempts).toBe(5);
      expect(RetryPresets.SLOW.baseDelay).toBe(2000);
    });

    it('should have NETWORK preset', () => {
      expect(RetryPresets.NETWORK.maxAttempts).toBe(5);
      expect(RetryPresets.NETWORK.retryCondition).toBeDefined();
    });
  });

  describe('Retry Statistics', () => {
    beforeEach(() => {
      retryStats.reset();
    });

    it('should record successful retries', () => {
      const operation = 'test_operation';

      // Simulate successful retry (2 attempts)
      retryStats.recordRetry(operation, true, 2);

      const stats = retryStats.getStats(operation);
      expect(stats.successfulRetries).toBe(1);
      expect(stats.totalAttempts).toBe(2);
      expect(stats.averageAttempts).toBe(2);
    });

    it('should record failed retries', () => {
      const operation = 'test_operation';

      // Simulate failed retry (3 attempts)
      retryStats.recordRetry(operation, false, 3);

      const stats = retryStats.getStats(operation);
      expect(stats.failedRetries).toBe(1);
      expect(stats.totalAttempts).toBe(3);
      expect(stats.lastFailure).toBeInstanceOf(Date);
    });

    it('should calculate average attempts', () => {
      const operation = 'test_operation';

      retryStats.recordRetry(operation, true, 2);  // success with 2 attempts
      retryStats.recordRetry(operation, true, 3);  // success with 3 attempts
      retryStats.recordRetry(operation, false, 1); // failure with 1 attempt

      const stats = retryStats.getStats(operation);
      expect(stats.successfulRetries).toBe(2);
      expect(stats.failedRetries).toBe(1);
      expect(stats.totalAttempts).toBe(6);
      expect(stats.averageAttempts).toBe(2); // 6 total / 3 retries
    });
  });

  describe('Error Handling', () => {
    it('should preserve original error after retries', async () => {
      const originalError = new Error('Original error');
      const operation = jest.fn().mockRejectedValue(originalError);

      const result = await withRetry(operation, { maxAttempts: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(originalError);
    });

    it('should handle non-Error exceptions', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      const result = await withRetry(operation, { maxAttempts: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });

    it('should not retry more than maxAttempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fails'));

      const result = await withRetry(operation, { maxAttempts: 3 });

      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
