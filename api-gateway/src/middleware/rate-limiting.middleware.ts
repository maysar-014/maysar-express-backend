/**
 * Rate Limiting Middleware
 * 
 * Handles rate limiting for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitConfig, RateLimitState } from '../types';

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

export class RateLimitingMiddleware {
  private config: RateLimitConfig;
  private rateLimitStates: Map<string, RateLimitState> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: this.defaultKeyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      onLimitReached: this.defaultOnLimitReached,
      ...config,
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStates();
    }, 60000); // Clean up every minute
  }

  middleware(options?: RateLimitOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      const opts = {
        ...this.config,
        ...options,
      };

      const key = opts.keyGenerator!(req);
      const now = new Date();

      // Get or create rate limit state
      let state = this.rateLimitStates.get(key);
      if (!state) {
        state = {
          key,
          count: 0,
          resetTime: new Date(now.getTime() + opts.windowMs!),
        };
        this.rateLimitStates.set(key, state);
      }

      // Check if window has expired
      if (now >= state.resetTime) {
        state.count = 0;
        state.resetTime = new Date(now.getTime() + opts.windowMs!);
      }

      // Check if limit is reached
      if (state.count >= opts.maxRequests!) {
        if (opts.onLimitReached) {
          opts.onLimitReached(req, res);
        } else {
          this.defaultOnLimitReached(req, res);
        }
        return;
      }

      // Increment counter
      state.count++;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', opts.maxRequests!);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests! - state.count));
      res.setHeader('X-RateLimit-Reset', state.resetTime.toISOString());

      // Track request completion
      const originalSend = res.send;
      res.send = function(body?: any) {
        const statusCode = res.statusCode;
        
        // Skip counting based on configuration
        if ((opts.skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
            (opts.skipFailedRequests && statusCode >= 400)) {
          state.count--;
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  private defaultKeyGenerator(req: Request): string {
    // Use IP address as default key
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
    return `ip:${ip}`;
  }

  private defaultOnLimitReached(req: Request, res: Response): void {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        details: {
          retryAfter: Math.ceil(this.config.windowMs! / 1000),
        },
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  }

  private cleanupExpiredStates(): void {
    const now = new Date();
    
    for (const [key, state] of this.rateLimitStates.entries()) {
      if (now >= state.resetTime) {
        this.rateLimitStates.delete(key);
      }
    }
  }

  // Utility method to get current rate limit status
  getRateLimitStatus(key: string): RateLimitState | null {
    return this.rateLimitStates.get(key) || null;
  }

  // Utility method to reset rate limit for a key
  resetRateLimit(key: string): void {
    this.rateLimitStates.delete(key);
  }

  // Utility method to get all active rate limit states
  getAllRateLimitStates(): Map<string, RateLimitState> {
    return new Map(this.rateLimitStates);
  }

  // Cleanup method
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rateLimitStates.clear();
  }
}

// Default rate limiting middleware instance
export const rateLimitingMiddleware = new RateLimitingMiddleware();

// Export middleware function
export const rateLimit = rateLimitingMiddleware.middleware();

// Pre-defined rate limiting middleware functions
export const strictRateLimit = rateLimitingMiddleware.middleware({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
});

export const moderateRateLimit = rateLimitingMiddleware.middleware({
  windowMs: 900000, // 15 minutes
  maxRequests: 100,
});

export const generousRateLimit = rateLimitingMiddleware.middleware({
  windowMs: 3600000, // 1 hour
  maxRequests: 1000,
});