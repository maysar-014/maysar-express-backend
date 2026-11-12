/**
 * Maysar Engineering — Retry with Exponential Backoff
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 13: Concurrency and Asynchronous Processing — Retry limits,
 *     Retry backoff
 *   - Article 18: Financial and Transactional Integrity — Retry mechanisms
 *     shall not cause duplicate charges
 *   - Article 7: Resource Efficiency Doctrine — Concurrency and execution overhead
 * 
 * Provides retry with exponential backoff and jitter for retryable operations.
 * Prevents thundering herd and provides controlled retry behavior.
 */

import { logger } from '../core/logger';



export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Minimum timeout in ms between retries (default: 1000ms) */
  minTimeout?: number;
  /** Maximum timeout in ms between retries (default: 30000ms) */
  maxTimeout?: number;
  /** Backoff multiplier (default: 2) */
  factor?: number;
  /** Jitter factor (0-1, default: 0.2) */
  jitter?: number;
  /** Predicate to determine if error is retryable */
  isRetryable?: (error: any) => boolean;
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function calculateBackoff(attempt: number, options: RetryOptions): number {
  const { minTimeout = 1000, maxTimeout = 30000, factor = 2, jitter = 0.2 } = options;
  
  // Exponential backoff: minTimeout * factor^attempt
  const delay = Math.min(minTimeout * Math.pow(factor, attempt), maxTimeout);
  
  // Add jitter: random value between (delay - jitter*delay) and (delay + jitter*delay)
  const jitterAmount = delay * jitter;
  const jitteredDelay = delay + (Math.random() * 2 - 1) * jitterAmount;
  
  return Math.max(0, Math.min(jitteredDelay, maxTimeout));
}

/**
 * Default retryable error check.
 * Retries on network errors, timeouts, and 5xx errors.
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    return true;
  }
  
  // HTTP 5xx errors
  if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }
  
  // HTTP 429 (Too Many Requests)
  if (error.statusCode === 429) {
    return true;
  }
  
  // Prisma connection errors
  if (error.code === 'P2002' || error.code === 'P2003' || error.code === 'P2010' || error.code === 'P2011' || error.code === 'P2012' || error.code === 'P2013' || error.code === 'P2014' || error.code === 'P2015' || error.code === 'P2016' || error.code === 'P2017' || error.code === 'P2018' || error.code === 'P2019' || error.code === 'P2020' || error.code === 'P2021' || error.code === 'P2022' || error.code === 'P2023' || error.code === 'P2024' || error.code === 'P2025') {
    return true;
  }
  
  return false;
}

/**
 * Execute an async function with exponential backoff retry.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    isRetryable = isRetryableError,
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If not retryable or no retries left, throw
      if (!isRetryable(error) || attempt === retries) {
        throw error;
      }
      
      // Calculate backoff delay
      const delay = calculateBackoff(attempt, options);
      logger.warn(`Retry attempt ${attempt + 1}/${retries} after ${delay}ms: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Synchronous wrapper for withRetry (for synchronous functions).
 */
export function withRetrySync<T>(
  fn: () => T,
  options: RetryOptions = {}
): T {
  const { retries = 3, isRetryable = isRetryableError } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error) || attempt === retries) {
        throw error;
      }
      
      const delay = calculateBackoff(attempt, options);
      logger.warn(`Retry attempt ${attempt + 1}/${retries} after ${delay}ms: ${error.message}`);
      
      // Synchronous sleep
      const start = Date.now();
      while (Date.now() - start < delay) {
        // Busy wait - acceptable for short delays
      }
    }
  }
  
  throw lastError;
}
