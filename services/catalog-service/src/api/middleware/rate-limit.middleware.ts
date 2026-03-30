/**
 * Rate Limiting Middleware
 * Advanced rate limiting with distributed caching and adaptive throttling
 * Implements multiple strategies: fixed window, sliding window, token bucket
 */

import { Request, Response, NextFunction } from 'express';
import type Redis from 'ioredis';
import { getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';

// =====================================================================================
// RATE LIMITING CONFIGURATION
// =====================================================================================

/**
 * Rate Limiting Configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  strategy: 'fixed' | 'sliding' | 'token-bucket';
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (req: Request) => string;
  skip: (req: Request) => boolean;
  onLimitReached: (req: Request, res: Response) => void;
  headers: boolean;
  enableAnalytics: boolean;
  burstMultiplier: number;
  adaptiveThrottling: boolean;
  whitelist: string[];
  blacklist: string[];
  enableDistributedCache: boolean;
  cachePrefix: string;
}

/**
 * Default Rate Limiting Configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  strategy: 'fixed',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skip: () => false,
  onLimitReached: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    });
  },
  headers: true,
  enableAnalytics: true,
  burstMultiplier: 1.2,
  adaptiveThrottling: false,
  whitelist: [],
  blacklist: [],
  enableDistributedCache: Boolean(process.env.REDIS_URL) && process.env.NODE_ENV !== 'test',
  cachePrefix: 'ratelimit:'
};

// =====================================================================================
// RATE LIMITING INTERFACES
// =====================================================================================

/**
 * Rate Limit Store Interface
 */
export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }>;
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetTime: number;
  current: number;
  retryAfter?: number;
}

/**
 * Rate Limit Analytics
 */
export interface RateLimitAnalytics {
  totalRequests: number;
  limitedRequests: number;
  topLimitedIPs: Array<{ ip: string; count: number }>;
  averageRequestRate: number;
  peakRequestRate: number;
}

// =====================================================================================
// RATE LIMITING MIDDLEWARE
// =====================================================================================

/**
 * Rate Limiting Middleware Factory
 */
export function createRateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = normalizeRateLimitConfig(config);
  const store = createRateLimitStore(finalConfig);
  const analytics = finalConfig.enableAnalytics ? new RateLimitAnalyticsTracker() : null;
  const deferCounting = finalConfig.skipSuccessfulRequests || finalConfig.skipFailedRequests;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if configured
      if (finalConfig.skip(req)) {
        return next();
      }

      // Check whitelist/blacklist
      const clientKey = finalConfig.keyGenerator(req);

      if (finalConfig.blacklist.includes(clientKey)) {
        return finalConfig.onLimitReached(req, res);
      }

      if (finalConfig.whitelist.includes(clientKey)) {
        return next();
      }

      // Apply rate limiting
      const result = deferCounting && finalConfig.strategy === 'fixed'
        ? await checkFixedWindowLimit(clientKey, finalConfig, store, Math.floor(finalConfig.maxRequests * finalConfig.burstMultiplier))
        : await applyRateLimit(clientKey, finalConfig, store);

      // Update analytics
      if (analytics) {
        analytics.recordRequest(clientKey, result);
      }

      // Set headers
      if (finalConfig.headers) {
        setRateLimitHeaders(res, result, finalConfig);
      }

      // Check if limit exceeded
      if (result.limited) {
        finalConfig.onLimitReached(req, res);
        return;
      }

      if (deferCounting && finalConfig.strategy === 'fixed') {
        attachDeferredRateLimitCount(res, store, clientKey, finalConfig);
      }

      // Continue to next middleware
      next();

    } catch (error) {
      console.error('[RATE LIMIT] Error:', error);
      // On error, allow request to continue (fail open)
      next();
    }
  };
}

/**
 * Fixed Window Rate Limiting
 */
export function fixedWindowRateLimit(config: Partial<RateLimitConfig> = {}) {
  return createRateLimit({
    ...config,
    strategy: 'fixed'
  });
}

/**
 * Sliding Window Rate Limiting
 */
export function slidingWindowRateLimit(config: Partial<RateLimitConfig> = {}) {
  return createRateLimit({
    ...config,
    strategy: 'sliding'
  });
}

/**
 * Token Bucket Rate Limiting
 */
export function tokenBucketRateLimit(config: Partial<RateLimitConfig> = {}) {
  return createRateLimit({
    ...config,
    strategy: 'token-bucket'
  });
}

/**
 * IP-based Rate Limiting
 */
export function ipRateLimit(config: Partial<RateLimitConfig> = {}) {
  return createRateLimit({
    ...config,
    keyGenerator: (req: Request) => req.ip || req.connection.remoteAddress || 'unknown'
  });
}

/**
 * User-based Rate Limiting
 */
export function userRateLimit(config: Partial<RateLimitConfig> = {}) {
  return createRateLimit({
    ...config,
    keyGenerator: (req: Request) => (req as any).user?.userId || req.ip || 'anonymous'
  });
}

/**
 * API Key-based Rate Limiting
 */
export function apiKeyRateLimit(config: Partial<RateLimitConfig> = {}) {
  return createRateLimit({
    ...config,
    keyGenerator: (req: Request) => req.headers['x-api-key'] as string || req.ip || 'unknown'
  });
}

// =====================================================================================
// RATE LIMITING IMPLEMENTATION
// =====================================================================================

/**
 * Apply rate limiting based on strategy
 */
async function applyRateLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore
): Promise<RateLimitResult> {
  const windowStart = Math.floor(Date.now() / config.windowMs) * config.windowMs;
  const maxRequests = Math.floor(config.maxRequests * config.burstMultiplier);

  switch (config.strategy) {
    case 'fixed':
      return await applyFixedWindowLimit(key, config, store, maxRequests);

    case 'sliding':
      return await applySlidingWindowLimit(key, config, store, maxRequests);

    case 'token-bucket':
      return await applyTokenBucketLimit(key, config, store, maxRequests);

    default:
      throw new Error(`Unknown rate limiting strategy: ${config.strategy}`);
  }
}

/**
 * Fixed Window Rate Limiting Implementation
 */
async function applyFixedWindowLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore,
  maxRequests: number
): Promise<RateLimitResult> {
  const storeKey = `${config.cachePrefix}${key}:${Math.floor(Date.now() / config.windowMs)}`;
  const result = await store.increment(storeKey, config.windowMs);

  const limited = result.count > maxRequests;
  const remaining = Math.max(0, maxRequests - result.count);

  return {
    limited,
    remaining,
    resetTime: result.resetTime,
    current: result.count,
    retryAfter: limited ? Math.ceil((result.resetTime - Date.now()) / 1000) : undefined
  };
}

/**
 * Sliding Window Rate Limiting Implementation
 */
async function applySlidingWindowLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore,
  maxRequests: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowCount = 10; // Number of sub-windows
  const subWindowMs = config.windowMs / windowCount;

  let totalRequests = 0;

  // Count requests in sliding window
  for (let i = 0; i < windowCount; i++) {
    const windowStart = now - (i * subWindowMs);
    const storeKey = `${config.cachePrefix}${key}:${Math.floor(windowStart / config.windowMs)}`;
    const result = await store.get(storeKey);

    if (result) {
      // Weight the count based on how much of the sub-window is still active
      const weight = Math.max(0, (result.resetTime - now) / subWindowMs);
      totalRequests += result.count * weight;
    }
  }

  const limited = totalRequests >= maxRequests;
  const remaining = Math.max(0, maxRequests - Math.floor(totalRequests));

  return {
    limited,
    remaining,
    resetTime: now + config.windowMs,
    current: Math.floor(totalRequests),
    retryAfter: limited ? Math.ceil(config.windowMs / 1000) : undefined
  };
}

/**
 * Token Bucket Rate Limiting Implementation
 */
async function applyTokenBucketLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore,
  maxRequests: number
): Promise<RateLimitResult> {
  const storeKey = `${config.cachePrefix}bucket:${key}`;
  const refillRate = maxRequests / (config.windowMs / 1000); // tokens per second

  // Get current bucket state
  const bucketState = await store.get(storeKey) || {
    count: maxRequests,
    resetTime: Date.now() + config.windowMs
  };

  const now = Date.now();
  const timePassed = now - (bucketState.resetTime - config.windowMs);
  const tokensToAdd = Math.floor(timePassed * refillRate / 1000);

  const currentTokens = Math.min(maxRequests, bucketState.count + tokensToAdd);
  const newTokenCount = currentTokens - 1; // Consume one token

  // Update bucket state
  await store.increment(storeKey, config.windowMs);

  const limited = newTokenCount < 0;
  const remaining = Math.max(0, newTokenCount);

  return {
    limited,
    remaining,
    resetTime: now + config.windowMs,
    current: maxRequests - remaining,
    retryAfter: limited ? Math.ceil(1 / refillRate) : undefined
  };
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Create rate limit store based on configuration
 */
function createRateLimitStore(config: RateLimitConfig): RateLimitStore {
  if (config.enableDistributedCache && process.env.REDIS_URL) {
    return new RedisRateLimitStore(config.cachePrefix);
  }

  if (config.enableDistributedCache && !process.env.REDIS_URL) {
    console.warn('[RATE LIMIT] Distributed cache enabled but REDIS_URL is missing; falling back to memory store.');
  }

  return new MemoryRateLimitStore();
}

/**
 * Normalize configuration so malformed values do not accidentally block requests.
 */
function normalizeRateLimitConfig(config: Partial<RateLimitConfig> = {}): RateLimitConfig {
  const merged = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };

  return {
    ...merged,
    windowMs: Number.isFinite(merged.windowMs) && merged.windowMs > 0
      ? merged.windowMs
      : DEFAULT_RATE_LIMIT_CONFIG.windowMs,
    maxRequests: Number.isFinite(merged.maxRequests) && merged.maxRequests > 0
      ? merged.maxRequests
      : DEFAULT_RATE_LIMIT_CONFIG.maxRequests,
    burstMultiplier: Number.isFinite(merged.burstMultiplier) && merged.burstMultiplier > 0
      ? merged.burstMultiplier
      : DEFAULT_RATE_LIMIT_CONFIG.burstMultiplier,
    whitelist: Array.isArray(merged.whitelist) ? merged.whitelist : [],
    blacklist: Array.isArray(merged.blacklist) ? merged.blacklist : []
  };
}

/**
 * Check fixed window state without consuming a hit yet.
 * Used when the middleware needs to defer counting until the response finishes.
 */
async function checkFixedWindowLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore,
  maxRequests: number
): Promise<RateLimitResult> {
  const storeKey = `${config.cachePrefix}${key}:${Math.floor(Date.now() / config.windowMs)}`;
  const existing = await store.get(storeKey);
  const count = existing?.count ?? 0;
  const resetTime = existing?.resetTime ?? (Math.floor(Date.now() / config.windowMs) * config.windowMs + config.windowMs);
  const limited = count >= maxRequests;
  const remaining = Math.max(0, maxRequests - count);

  return {
    limited,
    remaining,
    resetTime,
    current: count,
    retryAfter: limited ? Math.ceil((resetTime - Date.now()) / 1000) : undefined
  };
}

/**
 * Defer request counting until the response finishes.
 * This is only used for the skipSuccessfulRequests/skipFailedRequests paths.
 */
function attachDeferredRateLimitCount(
  res: Response,
  store: RateLimitStore,
  key: string,
  config: RateLimitConfig
): void {
  const response = res as Response & {
    once?: (event: string, listener: () => void) => unknown;
    statusCode?: number;
  };

  if (typeof response.once !== 'function') {
    return;
  }

  const storeKey = `${config.cachePrefix}${key}:${Math.floor(Date.now() / config.windowMs)}`;
  response.once('finish', () => {
    const statusCode = response.statusCode ?? 200;
    const shouldCount = (!config.skipSuccessfulRequests || statusCode >= 400)
      && (!config.skipFailedRequests || statusCode < 400);

    if (!shouldCount) {
      return;
    }

    void store.increment(storeKey, config.windowMs).catch(error => {
      console.error('[RATE LIMIT] Deferred counter error:', error);
    });
  });
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(res: Response, result: RateLimitResult, config: RateLimitConfig): void {
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'X-RateLimit-Current': result.current.toString()
  };

  const responseWithHeader = res as Response & {
    setHeader?: (name: string, value: string) => unknown;
  };

  if (typeof responseWithHeader.setHeader === 'function') {
    for (const [name, value] of Object.entries(headers)) {
      responseWithHeader.setHeader(name, value);
    }
  } else {
    res.set(headers);
  }

  if (result.retryAfter) {
    if (typeof responseWithHeader.setHeader === 'function') {
      responseWithHeader.setHeader('Retry-After', result.retryAfter.toString());
    } else {
      res.set('Retry-After', result.retryAfter.toString());
    }
  }
}

// =====================================================================================
// STORE IMPLEMENTATIONS
// =====================================================================================

/**
 * In-Memory Rate Limit Store
 */
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    } else {
      // Existing window
      entry.count++;
      this.store.set(key, entry);
      return { count: entry.count, resetTime: entry.resetTime };
    }
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    return this.store.get(key) || null;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const REDIS_RATE_LIMIT_LUA = `
local totalHits = redis.call("INCR", KEYS[1])
local timeToExpire = redis.call("PTTL", KEYS[1])
if timeToExpire == -1 or timeToExpire == -2 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  timeToExpire = ARGV[1]
end
return { totalHits, timeToExpire }
`;

/**
 * Redis-backed Rate Limit Store
 */
class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private readonly prefix: string;

  constructor(prefix: string) {
    this.redis = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));
    this.prefix = prefix;
  }

  private resolveKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const redisKey = this.resolveKey(key);
    const result = await this.redis.eval(
      REDIS_RATE_LIMIT_LUA,
      1,
      redisKey,
      windowMs
    ) as [number, number];

    const totalHits = Number(result[0]);
    const pttl = Number(result[1]);
    const resetTime = Date.now() + (pttl > 0 ? pttl : windowMs);

    return { count: totalHits, resetTime };
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const redisKey = this.resolveKey(key);
    const result = await this.redis
      .multi()
      .get(redisKey)
      .pttl(redisKey)
      .exec();

    if (!result || result.length < 2) {
      return null;
    }

    const count = result[0]?.[1];
    const pttl = result[1]?.[1];

    if (count === null || count === undefined || pttl === null || pttl === undefined) {
      return null;
    }

    const ttlMs = Number(pttl);
    if (Number.isNaN(ttlMs) || ttlMs < 0) {
      return null;
    }

    return {
      count: Number(count),
      resetTime: Date.now() + ttlMs
    };
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(this.resolveKey(key));
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL cleanup automatically.
  }
}

/**
 * Rate Limit Analytics Tracker
 */
class RateLimitAnalyticsTracker {
  private analytics: RateLimitAnalytics = {
    totalRequests: 0,
    limitedRequests: 0,
    topLimitedIPs: [],
    averageRequestRate: 0,
    peakRequestRate: 0
  };

  private requestCounts = new Map<string, number>();
  private startTime = Date.now();

  recordRequest(ip: string, result: RateLimitResult): void {
    this.analytics.totalRequests++;

    if (result.limited) {
      this.analytics.limitedRequests++;
      this.requestCounts.set(ip, (this.requestCounts.get(ip) || 0) + 1);
    }

    // Update top limited IPs
    this.updateTopLimitedIPs();

    // Calculate rates
    const elapsedMinutes = (Date.now() - this.startTime) / (1000 * 60);
    if (elapsedMinutes > 0) {
      this.analytics.averageRequestRate = this.analytics.totalRequests / elapsedMinutes;
      this.analytics.peakRequestRate = Math.max(this.analytics.peakRequestRate, this.analytics.averageRequestRate);
    }
  }

  private updateTopLimitedIPs(): void {
    const sortedIPs = Array.from(this.requestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    this.analytics.topLimitedIPs = sortedIPs;
  }

  getAnalytics(): RateLimitAnalytics {
    return { ...this.analytics };
  }

  reset(): void {
    this.analytics = {
      totalRequests: 0,
      limitedRequests: 0,
      topLimitedIPs: [],
      averageRequestRate: 0,
      peakRequestRate: 0
    };
    this.requestCounts.clear();
    this.startTime = Date.now();
  }
}

// =====================================================================================
// RATE LIMITING PRESETS
// =====================================================================================

/**
 * Rate Limiting Presets
 */
export const RateLimitPresets = {
  /**
   * Strict API limits
   */
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    strategy: 'fixed' as const
  },

  /**
   * Standard API limits
   */
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    strategy: 'fixed' as const
  },

  /**
   * Lenient API limits
   */
  lenient: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    strategy: 'sliding' as const
  },

  /**
   * Authentication endpoints
   */
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    strategy: 'fixed' as const
  },

  /**
   * Search endpoints
   */
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    strategy: 'sliding' as const
  },

  /**
   * File upload endpoints
   */
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    strategy: 'token-bucket' as const
  }
};

// =====================================================================================
// RATE LIMITING FACTORY
// =====================================================================================

/**
 * Rate Limiting Middleware Factory
 */
export class RateLimitMiddlewareFactory {
  static createFixedWindow(config: Partial<RateLimitConfig> = {}) {
    return fixedWindowRateLimit(config);
  }

  static createSlidingWindow(config: Partial<RateLimitConfig> = {}) {
    return slidingWindowRateLimit(config);
  }

  static createTokenBucket(config: Partial<RateLimitConfig> = {}) {
    return tokenBucketRateLimit(config);
  }

  static createIPBased(config: Partial<RateLimitConfig> = {}) {
    return ipRateLimit(config);
  }

  static createUserBased(config: Partial<RateLimitConfig> = {}) {
    return userRateLimit(config);
  }

  static createApiKeyBased(config: Partial<RateLimitConfig> = {}) {
    return apiKeyRateLimit(config);
  }

  static createPreset(preset: keyof typeof RateLimitPresets, overrides: Partial<RateLimitConfig> = {}) {
    return createRateLimit({ ...RateLimitPresets[preset], ...overrides });
  }

  static createMultiTier(tiers: Array<{ threshold: number; config: Partial<RateLimitConfig> }>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // In a real implementation, check user tier and apply appropriate rate limit
      // For now, apply standard rate limiting
      const middleware = createRateLimit(RateLimitPresets.standard);
      return middleware(req, res, next);
    };
  }
}
