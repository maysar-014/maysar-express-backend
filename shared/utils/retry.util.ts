/**
 * Retry Utility
 * Implements exponential backoff retry logic for resilient operations
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalDuration: number;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryCondition: (error: unknown) => {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const shapedError = error as { code?: string; status?: number };
    // Retry on network errors, timeouts, and 5xx status codes
    if (shapedError.code === 'ECONNRESET' || shapedError.code === 'ETIMEDOUT' || shapedError.code === 'ENOTFOUND') {
      return true;
    }
    if (shapedError.status && shapedError.status >= 500 && shapedError.status < 600) {
      return true;
    }
    return false;
  },
};

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = Math.min(
    options.baseDelay * Math.pow(options.backoffFactor, attempt - 1),
    options.maxDelay
  );

  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, delay + jitter);
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      const shouldRetry = config.retryCondition ? config.retryCondition(error) : true;

      if (!shouldRetry || attempt === config.maxAttempts) {
        break;
      }

      const delay = calculateDelay(attempt, config);

      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, error, delay);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Retry wrapper for async functions with method binding
 */
export function createRetryableFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: Partial<RetryOptions> = {}
) {
  return async (...args: T): Promise<R> => {
    const result = await withRetry(() => fn(...args), options);

    if (result.success) {
      return result.data as R;
    } else {
      throw result.error;
    }
  };
}

/**
 * Retry configuration presets
 */
export const RetryPresets = {
  // Fast retries for quick operations
  FAST: {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 1000,
    backoffFactor: 2,
  },

  // Standard retries for normal operations
  STANDARD: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },

  // Slow retries for expensive operations
  SLOW: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 1.5,
  },

  // Network-specific retries
  NETWORK: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 15000,
    backoffFactor: 2,
    retryCondition: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any
    ) => {
      // Error shape varies across network and transport clients; runtime checks are required.
      return error.code === 'ECONNRESET' ||
             error.code === 'ETIMEDOUT' ||
             error.code === 'ENOTFOUND' ||
             error.code === 'ECONNREFUSED' ||
             (error.status >= 500 && error.status < 600);
    },
  },

  // Database-specific retries
  DATABASE: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any
    ) => {
      // Error shape varies by database driver and ORM; no single static type is reliable here.
      // Retry on connection errors, deadlocks, and serialization failures
      return error.code === 'CONNECTION_LOST' ||
             error.code === 'ER_LOCK_DEADLOCK' ||
             error.code === '40001' || // Serialization failure
             error.code === 'ETIMEDOUT';
    },
  },

  // External API retries
  API: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any
    ) => {
      // API errors differ by provider (status/code/response nesting), so runtime property checks are intentional.
      return error.code === 'ECONNRESET' ||
             error.code === 'ETIMEDOUT' ||
             (error.status && (error.status === 429 || (error.status >= 500 && error.status < 600)));
    },
  },
};

/**
 * Retry statistics and monitoring
 */
export class RetryStats {
  private stats = new Map<string, {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    averageAttempts: number;
    lastFailure: Date | null;
  }>();

  recordRetry(operation: string, success: boolean, attempts: number): void {
    const current = this.stats.get(operation) || {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      lastFailure: null,
    };

    current.totalAttempts += attempts;

    if (success && attempts > 1) {
      current.successfulRetries++;
    } else if (!success) {
      current.failedRetries++;
      current.lastFailure = new Date();
    }

    // Calculate running average
    const totalRetries = current.successfulRetries + current.failedRetries;
    if (totalRetries > 0) {
      current.averageAttempts = current.totalAttempts / totalRetries;
    }

    this.stats.set(operation, current);
  }

  getStats(operation: string) {
    return this.stats.get(operation) || {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      lastFailure: null,
    };
  }

  getAllStats() {
    return Object.fromEntries(this.stats);
  }

  reset(): void {
    this.stats.clear();
  }
}

// Global retry stats instance
export const retryStats = new RetryStats();
