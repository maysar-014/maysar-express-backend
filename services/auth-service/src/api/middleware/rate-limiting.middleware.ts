import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

// In-memory rate limiting store (replace with Redis in production)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      const resetTime = now + windowMs;
      const newEntry = { count: 1, resetTime };
      this.store.set(key, newEntry);
      return newEntry;
    } else {
      // Increment existing entry
      entry.count++;
      return entry;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const store = new MemoryRateLimitStore();

// Cleanup expired entries every 5 minutes
setInterval(() => store.cleanup(), 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipFailedRequests = false,
    skipSuccessfulRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate key based on IP address
    const key = req.ip || req.connection.remoteAddress || 'unknown';

    // Get current count and reset time
    const { count, resetTime } = store.increment(key, windowMs);

    // Set rate limit headers
    const remaining = Math.max(0, max - count);
    const reset = Math.ceil((resetTime - Date.now()) / 1000);

    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString()
    });

    // Check if limit exceeded
    if (count > max) {
      logger.warn('Rate limit exceeded', {
        ip: key,
        count,
        max,
        resetTime: new Date(resetTime).toISOString(),
        url: req.url,
        method: req.method
      });

      res.status(429).json({
        success: false,
        message,
        retryAfter: reset
      });
      return;
    }

    // Add rate limit info to response
    res.on('finish', () => {
      const statusCode = res.statusCode;

      // Skip logging for successful/failed requests if configured
      if ((skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)) {
        return;
      }

      logger.debug('Rate limit status', {
        ip: key,
        count,
        remaining,
        reset,
        statusCode,
        url: req.url,
        method: req.method
      });
    });

    next();
  };
}

/**
 * Create rate limit middleware with default settings
 */
export function createRateLimit(options: Partial<RateLimitOptions> = {}) {
  const defaults: RateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later.',
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  };

  return rateLimit({ ...defaults, ...options });
}
