import { Request, Response, NextFunction } from 'express';
import { RedisCache } from '../../infrastructure/cache/redis-cache';

/**
 * Rate limiting middleware using Redis for distributed rate limiting
 */
export class RateLimiter {
  private cache: RedisCache;
  private windowMs: number;
  private maxRequests: number;

  constructor(
    cache: RedisCache,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    maxRequests: number = 100
  ) {
    this.cache = cache;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Rate limiting middleware for general API requests
   */
  middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = this.getClientKey(req);
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;

    try {
      // Get current request count for this window
      const countKey = `${key}:${windowStart}`;
      const currentCount = parseInt(await this.cache.get(countKey) || '0');

      // Check if limit exceeded
      if (currentCount >= this.maxRequests) {
        const resetTime = windowStart + this.windowMs;
        const remainingTime = Math.ceil((resetTime - now) / 1000);

        res.set({
          'X-RateLimit-Limit': this.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
          'Retry-After': remainingTime.toString()
        });

        res.status(429).json({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: remainingTime
        });
        return;
      }

      // Increment counter
      await this.cache.set(countKey, (currentCount + 1).toString(), Math.ceil(this.windowMs / 1000));

      // Set rate limit headers
      const remainingRequests = Math.max(0, this.maxRequests - currentCount - 1);
      const resetTime = windowStart + this.windowMs;

      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      });

      next();
    } catch (error) {
      // If Redis fails, allow request but log error
      console.error('Rate limiting error:', error);
      next();
    }
  };

  /**
   * Stricter rate limiting for posting actions
   */
  postingMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `posting:${this.getClientKey(req)}`;
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;

    try {
      const countKey = `${key}:${windowStart}`;
      const currentCount = parseInt(await this.cache.get(countKey) || '0');

      // Stricter limit for posting (5 posts per 15 minutes)
      const postingLimit = 5;

      if (currentCount >= postingLimit) {
        const resetTime = windowStart + this.windowMs;
        const remainingTime = Math.ceil((resetTime - now) / 1000);

        res.set({
          'X-RateLimit-Limit': postingLimit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
          'Retry-After': remainingTime.toString()
        });

        res.status(429).json({
          error: 'TooManyRequests',
          message: 'Posting rate limit exceeded. Please slow down.',
          retryAfter: remainingTime
        });
        return;
      }

      await this.cache.set(countKey, (currentCount + 1).toString(), Math.ceil(this.windowMs / 1000));

      const remainingRequests = Math.max(0, postingLimit - currentCount - 1);
      const resetTime = windowStart + this.windowMs;

      res.set({
        'X-RateLimit-Limit': postingLimit.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      });

      next();
    } catch (error) {
      console.error('Posting rate limiting error:', error);
      next();
    }
  };

  /**
   * Rate limiting for search endpoints
   */
  searchMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `search:${this.getClientKey(req)}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (60 * 1000)) * (60 * 1000); // 1 minute windows

    try {
      const countKey = `${key}:${windowStart}`;
      const currentCount = parseInt(await this.cache.get(countKey) || '0');

      // 10 searches per minute
      const searchLimit = 10;

      if (currentCount >= searchLimit) {
        const resetTime = windowStart + (60 * 1000);
        const remainingTime = Math.ceil((resetTime - now) / 1000);

        res.set({
          'X-RateLimit-Limit': searchLimit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
          'Retry-After': remainingTime.toString()
        });

        res.status(429).json({
          error: 'TooManyRequests',
          message: 'Search rate limit exceeded. Please try again later.',
          retryAfter: remainingTime
        });
        return;
      }

      await this.cache.set(countKey, (currentCount + 1).toString(), 60); // 1 minute TTL

      const remainingRequests = Math.max(0, searchLimit - currentCount - 1);
      const resetTime = windowStart + (60 * 1000);

      res.set({
        'X-RateLimit-Limit': searchLimit.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      });

      next();
    } catch (error) {
      console.error('Search rate limiting error:', error);
      next();
    }
  };

  /**
   * Generate client identifier key for rate limiting
   */
  private getClientKey(req: Request): string {
    // Use IP address as primary identifier
    // In production, you might want to use API key or user ID
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Clean IP address (remove IPv6 prefix for IPv4)
    const cleanIp = ip.replace(/^::ffff:/, '');

    return `rate_limit:${cleanIp}`;
  }

  /**
   * Get rate limit status for a client
   */
  async getRateLimitStatus(clientKey: string): Promise<{
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const countKey = `${clientKey}:${windowStart}`;

    try {
      const currentCount = parseInt(await this.cache.get(countKey) || '0');
      const remaining = Math.max(0, this.maxRequests - currentCount);
      const reset = windowStart + this.windowMs;

      return {
        limit: this.maxRequests,
        remaining,
        reset
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return {
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowMs
      };
    }
  }

  /**
   * Reset rate limit for a client (admin function)
   */
  async resetRateLimit(clientKey: string): Promise<void> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const countKey = `${clientKey}:${windowStart}`;

    try {
      await this.cache.delete(countKey);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      throw error;
    }
  }
}

// Factory function to create rate limiter instance
export const createRateLimiter = (cache: RedisCache) => {
  return new RateLimiter(cache);
};

// Export middleware functions
export const createRateLimitMiddleware = (cache: RedisCache) => {
  const limiter = new RateLimiter(cache);
  return limiter.middleware;
};

export const createPostingRateLimitMiddleware = (cache: RedisCache) => {
  const limiter = new RateLimiter(cache);
  return limiter.postingMiddleware;
};

export const createSearchRateLimitMiddleware = (cache: RedisCache) => {
  const limiter = new RateLimiter(cache);
  return limiter.searchMiddleware;
};
