import { Request, Response, NextFunction } from 'express';
import expressRateLimit from 'express-rate-limit';
import { logger } from '../../infrastructure/services/logger.service';
import { RedisRateLimitStore } from '@shared/middleware/redis-rate-limit.store';
import { getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';
import { shouldBypassRateLimit } from '@shared/middleware/rate-limit.util';

const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));

export const generalLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  skip: shouldBypassRateLimit,
  store: new RedisRateLimitStore(redisClient, 'rl:general:'),
  passOnStoreError: true
});

export const strictLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.',
  skip: shouldBypassRateLimit,
  store: new RedisRateLimitStore(redisClient, 'rl:strict:'),
  passOnStoreError: true
});

export const loginLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skip: shouldBypassRateLimit,
  store: new RedisRateLimitStore(redisClient, 'rl:login:'),
  passOnStoreError: true
});

// Alias for generalLimiter to satisfy existing import in main.ts
export const rateLimiter = generalLimiter;

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  prefix?: string;
}

/**
 * Rate limiting middleware builder (legacy compatibility)
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
    prefix = 'rl:dynamic:'
  } = options;

  return expressRateLimit({
    windowMs,
    max,
    message,
    skipFailedRequests,
    skipSuccessfulRequests,
    skip: shouldBypassRateLimit,
    store: new RedisRateLimitStore(redisClient, prefix),
    passOnStoreError: true
  });
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
