/**
 * Retry Logic Implementation
 * Provides exponential backoff and configurable retry strategies
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;        // milliseconds
  maxDelay: number;           // milliseconds
  backoffMultiplier: number;  // exponential backoff multiplier
  jitter: boolean;            // add randomness to delay
  retryCondition?: (error: any) => boolean; // custom retry condition
}

export interface RetryStats {
  attempts: number;
  totalDelay: number;
  lastError: any;
  startTime: number;
  endTime: number;
}

export class RetryError extends Error {
  public readonly stats: RetryStats;
  public readonly lastError: any;

  constructor(message: string, stats: RetryStats, lastError: any) {
    super(message);
    this.name = 'RetryError';
    this.stats = stats;
    this.lastError = lastError;
  }
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,     // 1 second
  maxDelay: 30000,        // 30 seconds
  backoffMultiplier: 2,   // exponential backoff
  jitter: true,           // add randomness
  retryCondition: (error) => {
    // Default retry condition: retry on network errors and 5xx status codes
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return true;
    }

    // Retry on HTTP 5xx errors
    if (error.status >= 500) {
      return true;
    }

    // Don't retry on client errors (4xx) or other errors
    return false;
  }
};

/**
 * Calculate delay for next retry attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  delay = Math.min(delay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter (±25% of delay)
    const jitterRange = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterRange;
    delay = Math.max(0, delay); // Ensure non-negative
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const stats: RetryStats = {
    attempts: 0,
    totalDelay: 0,
    lastError: null,
    startTime: Date.now(),
    endTime: 0
  };

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    stats.attempts = attempt;

    try {
      const result = await fn();
      stats.endTime = Date.now();
      return result;
    } catch (error) {
      stats.lastError = error;

      // Check if we should retry
      const shouldRetry = attempt < finalConfig.maxAttempts &&
                          (!finalConfig.retryCondition || finalConfig.retryCondition(error as any));

      if (!shouldRetry) {
        stats.endTime = Date.now();
        throw new RetryError(
          `Operation failed after ${attempt} attempts`,
          stats,
          error
        );
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);
      stats.totalDelay += delay;

      console.log(`🔄 Retry attempt ${attempt}/${finalConfig.maxAttempts} failed, waiting ${delay}ms before retry:`, error instanceof Error ? error.message : 'Unknown error');

      await sleep(delay);
    }
  }

  // This should never be reached, but just in case
  stats.endTime = Date.now();
  throw new RetryError(
    `Operation failed after ${finalConfig.maxAttempts} attempts`,
    stats,
    stats.lastError
  );
}

/**
 * HTTP-specific retry configuration
 */
export const HTTP_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 500,
  maxDelay: 10000,
  retryCondition: (error) => {
    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return true;
    }

    // Retry on specific HTTP status codes
    if (error.status === 408 || // Request Timeout
        error.status === 429 || // Too Many Requests
        error.status >= 500) {  // Server errors
      return true;
    }

    // Don't retry on client errors (4xx except 408, 429)
    return false;
  }
};

/**
 * Database-specific retry configuration
 */
export const DATABASE_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 200,
  maxDelay: 5000,
  retryCondition: (error) => {
    // Retry on connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' || error.code === 'CONNECTION_LOST') {
      return true;
    }

    // Retry on deadlock or lock timeout
    if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      return true;
    }

    return false;
  }
};

/**
 * Redis-specific retry configuration
 */
export const REDIS_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 3000,
  retryCondition: (error) => {
    // Retry on connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' || error.message?.includes('Connection')) {
      return true;
    }

    return false;
  }
};

/**
 * Retry wrapper for functions that may fail
 */
export function createRetryableFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config: Partial<RetryConfig> = {}
) {
  return async (...args: T): Promise<R> => {
    return withRetry(() => fn(...args), config);
  };
}

/**
 * HTTP client with built-in retry logic
 */
export class RetryableHttpClient {
  private config: Partial<RetryConfig>;

  constructor(config: Partial<RetryConfig> = HTTP_RETRY_CONFIG) {
    this.config = config;
  }

  async fetch(input: string | URL, init?: RequestInit): Promise<Response> {
    return withRetry(async () => {
      const response = await fetch(input, init);

      if (response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    }, this.config);
  }

  async get(url: string, options?: RequestInit): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  async post(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const init: RequestInit = {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    };

    if (body) {
      init.body = JSON.stringify(body);
    }

    return this.fetch(url, init);
  }

  async put(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const init: RequestInit = {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    };

    if (body) {
      init.body = JSON.stringify(body);
    }

    return this.fetch(url, init);
  }

  async delete(url: string, options?: RequestInit): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

/**
 * Database operation with retry logic
 */
export class RetryableDatabaseClient {
  private config: Partial<RetryConfig>;

  constructor(config: Partial<RetryConfig> = DATABASE_RETRY_CONFIG) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return withRetry(operation, this.config);
  }
}

/**
 * Redis operation with retry logic
 */
export class RetryableRedisClient {
  private config: Partial<RetryConfig>;

  constructor(config: Partial<RetryConfig> = REDIS_RETRY_CONFIG) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return withRetry(operation, this.config);
  }
}

// Export default instances
export const httpClient = new RetryableHttpClient();
export const dbClient = new RetryableDatabaseClient();
export const redisClient = new RetryableRedisClient();
