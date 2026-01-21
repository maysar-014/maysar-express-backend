import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';
import { createError } from './error.middleware';

/**
 * Rate limiting configuration
 */
interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
}

/**
 * Rate limit store interface
 */
interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, count: number, resetTime: number): Promise<void>;
  increment(key: string, resetTime: number): Promise<{ count: number; resetTime: number }>;
}

/**
 * In-memory rate limit store (for single instance, replace with Redis for production)
 */
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    this.store.set(key, { count, resetTime });
  }

  async increment(key: string, resetTime: number): Promise<{ count: number; resetTime: number }> {
    const existing = await this.get(key);
    if (existing) {
      const newCount = existing.count + 1;
      await this.set(key, newCount, existing.resetTime);
      return { count: newCount, resetTime: existing.resetTime };
    } else {
      await this.set(key, 1, resetTime);
      return { count: 1, resetTime };
    }
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Global in-memory store instance
 */
const memoryStore = new MemoryRateLimitStore();

// Clean up expired entries every 5 minutes
setInterval(() => memoryStore.cleanup(), 5 * 60 * 1000);

/**
 * Rate limiting middleware factory
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const store = memoryStore; // Use global store, replace with Redis for production

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Generate rate limit key
      const key = options.keyGenerator
        ? options.keyGenerator(req)
        : getDefaultKey(req);

      // Check current rate limit status
      const current = await store.get(key);
      const now = Date.now();
      const windowStart = now - options.windowMs;

      let count: number;
      let resetTime: number;

      if (!current || current.resetTime < now) {
        // First request in window or window expired
        count = 1;
        resetTime = now + options.windowMs;
        await store.set(key, count, resetTime);
      } else {
        // Increment existing count
        const result = await store.increment(key, current.resetTime);
        count = result.count;
        resetTime = result.resetTime;
      }

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.maxRequests - count).toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'X-RateLimit-Window': options.windowMs.toString()
      });

      // Check if limit exceeded
      if (count > options.maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          count,
          limit: options.maxRequests,
          ip: req.ip,
          path: req.path,
          method: req.method
        });

        // Calculate retry-after time
        const retryAfter = Math.ceil((resetTime - now) / 1000);

        res.set('Retry-After', retryAfter.toString());
        next(createError.tooManyRequests('Too many requests, please try again later'));
        return;
      }

      // Log rate limit status for debugging
      if (count > options.maxRequests * 0.8) { // Log when approaching limit
        logger.info('Approaching rate limit', {
          key,
          count,
          limit: options.maxRequests,
          remaining: options.maxRequests - count
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error, ip: req.ip, path: req.path });
      // Don't block requests due to rate limiter errors
      next();
    }
  };
};

/**
 * Default key generator - uses IP address
 */
function getDefaultKey(req: Request): string {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * User-specific rate limiter (requires user authentication)
 */
export const createUserRateLimiter = (options: RateLimitOptions) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId;
      if (userId) {
        return `user:${userId}`;
      }
      // Fallback to IP if no user ID
      return getDefaultKey(req);
    }
  });
};

/**
 * API-specific rate limiter with different limits for different endpoints
 */
export const createEndpointRateLimiter = (baseOptions: RateLimitOptions) => {
  const endpointLimits: Record<string, Partial<RateLimitOptions>> = {
    // User management endpoints
    'POST:/api/v1/users': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 registrations per 15min
    'POST:/api/v1/users/*/verify-email': { maxRequests: 3, windowMs: 60 * 1000 }, // 3 verification attempts per minute
    'POST:/api/v1/users/search': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 searches per minute

    // General API limits
    'default': { maxRequests: 100, windowMs: 15 * 60 * 1000 } // 100 requests per 15min
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const endpointKey = `${req.method}:${req.route?.path || req.path}`;
    const endpointConfig = endpointLimits[endpointKey] || endpointLimits.default;

    const limiter = createRateLimiter({
      ...baseOptions,
      ...endpointConfig
    });

    return limiter(req, res, next);
  };
};

/**
 * Default rate limiter for API endpoints
 */
export const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

/**
 * Stricter rate limiter for sensitive operations
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

/**
 * Lenient rate limiter for public endpoints
 */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

/**
 * Get rate limit status for monitoring
 */
export const getRateLimitStatus = async (): Promise<{
  totalKeys: number;
  activeWindows: number;
  memoryUsage: number;
}> => {
  // This is a simple implementation for the memory store
  // In production with Redis, you'd query Redis for this info

  // Count active rate limit keys
  let totalKeys = 0;
  let activeWindows = 0;
  const now = Date.now();

  // This is approximate - in production, use Redis INFO command
  const estimatedMemoryUsage = (memoryStore as any).store?.size * 100 || 0; // Rough estimate

  return {
    totalKeys,
    activeWindows,
    memoryUsage: estimatedMemoryUsage
  };
};
