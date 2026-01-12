/**
 * Caching Middleware
 * HTTP response caching and cache invalidation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { cacheManager, cacheAside } from '../infrastructure/cache/cache-manager';
import { appLogger } from '../infrastructure/monitoring/logger';
import { metricsCollector } from '../infrastructure/monitoring/metrics';

export interface CacheOptions {
  ttl?: number;           // Time to live in seconds
  key?: string | ((req: Request) => string); // Custom cache key
  condition?: (req: Request, res: Response) => boolean; // When to cache
  tags?: string[];        // Cache tags for invalidation
  skipCache?: (req: Request) => boolean; // When to skip cache
}

/**
 * Response caching middleware
 * Caches HTTP responses based on configurable options
 */
export function cacheResponse(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    condition = defaultCacheCondition,
    skipCache = defaultSkipCache,
    key: keyGenerator = defaultCacheKey,
    tags = [],
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip caching if condition not met
    if (!condition(req, res) || skipCache(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;

    try {
      // Check if response is already cached
      const cachedResponse = await cacheManager.get(cacheKey);
      if (cachedResponse) {
        appLogger.debug(`Cache hit for ${req.method} ${req.path}`, { cacheKey });

        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);

        // Send cached response
        const { statusCode, headers, body } = cachedResponse;
        res.status(statusCode).set(headers).send(body);
        return;
      }

      // Cache miss - intercept response
      appLogger.debug(`Cache miss for ${req.method} ${req.path}`, { cacheKey });

      // Store original response methods
      const originalJson = res.json;
      const originalSend = res.send;
      const originalStatus = res.status;
      const originalSet = res.set;

      let responseData: any = null;
      let statusCode = 200;
      let responseHeaders: Record<string, string> = {};

      // Override status method
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Override set method to capture headers
      res.set = function(field: string | Record<string, string>, value?: string) {
        if (typeof field === 'string' && value) {
          responseHeaders[field] = value;
        } else if (typeof field === 'object') {
          responseHeaders = { ...responseHeaders, ...field };
        }
        // Call original set with proper typing
        return originalSet.call(this, field as any, value as any);
      };

      // Override json method
      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Override send method
      res.send = function(data: any) {
        responseData = data;
        return originalSend.call(this, data);
      };

      // Add finish listener to cache successful responses
      res.on('finish', async () => {
        // Only cache successful responses
        if (statusCode >= 200 && statusCode < 300 && responseData !== null) {
          try {
            const cacheValue = {
              statusCode,
              headers: responseHeaders,
              body: responseData,
              timestamp: Date.now(),
            };

            await cacheManager.set(cacheKey, cacheValue, {
              ttl,
              tags: [...tags, `method:${req.method}`, `path:${req.path}`],
            });

            appLogger.debug(`Cached response for ${req.method} ${req.path}`, {
              cacheKey,
              statusCode,
              ttl,
            });

          } catch (error) {
            appLogger.error('Failed to cache response', {
              cacheKey,
              error: (error as Error).message,
            });
          }
        }
      });

      // Set cache headers for cache miss
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

    } catch (error) {
      appLogger.error('Cache middleware error', {
        cacheKey: typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator,
        error: (error as Error).message,
      });

      // Continue without caching on error
      res.set('X-Cache', 'ERROR');
    }

    next();
  };
}

/**
 * Cache invalidation middleware
 * Invalidates cache based on request patterns
 */
export function cacheInvalidation(options: {
  patterns: Array<{
    method: string;
    path: RegExp;
    tags: string[];
  }>;
}) {
  const { patterns } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store invalidation for after request completes
    const invalidations: string[][] = [];

    // Check if this request should trigger invalidation
    for (const pattern of patterns) {
      if (req.method === pattern.method && pattern.path.test(req.path)) {
        invalidations.push(pattern.tags);
      }
    }

    if (invalidations.length > 0) {
      // Invalidate cache after response is sent
      res.on('finish', async () => {
        try {
          const allTags = invalidations.flat();
          const deleted = await cacheManager.invalidateByTags(allTags);

          if (deleted > 0) {
            appLogger.info(`Invalidated cache for ${req.method} ${req.path}`, {
              tags: allTags,
              deleted,
            });

            res.set('X-Cache-Invalidated', allTags.join(','));
          }
        } catch (error) {
          appLogger.error('Cache invalidation failed', {
            method: req.method,
            path: req.path,
            tags: invalidations.flat(),
            error: (error as Error).message,
          });
        }
      });
    }

    next();
  };
}

/**
 * Cache bypass middleware
 * Forces cache bypass for specific requests
 */
export function cacheBypass() {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.set('X-Cache-Bypass', 'true');
    next();
  };
}

/**
 * Cache statistics middleware
 * Adds cache performance headers
 */
export function cacheStats() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();

    res.on('finish', async () => {
      try {
        const stats = await cacheManager.getStats();
        const duration = Date.now() - startTime;

        // Add cache statistics headers
        res.set('X-Cache-Stats', JSON.stringify({
          strategies: stats.strategies.map(s => ({ name: s.name, ready: s.ready })),
          duration,
        }));

      } catch (error) {
        appLogger.debug('Failed to get cache stats', { error: (error as Error).message });
      }
    });

    next();
  };
}

/**
 * Default cache condition
 * Determines when to cache responses
 */
function defaultCacheCondition(req: Request, res: Response): boolean {
  // Only cache GET requests
  if (req.method !== 'GET') return false;

  // Don't cache if Cache-Control: no-cache
  if (req.get('Cache-Control') === 'no-cache') return false;

  // Don't cache error responses (already handled in finish listener)
  // Don't cache authenticated requests unless specified
  if (req.headers.authorization || (req as any).user) return false;

  // Don't cache API routes that modify data
  if (req.path.includes('/orders') && req.method !== 'GET') return false;

  return true;
}

/**
 * Default cache skip condition
 */
function defaultSkipCache(req: Request): boolean {
  // Skip cache if bypass header is set
  return req.get('X-Cache-Bypass') === 'true';
}

/**
 * Default cache key generator
 */
function defaultCacheKey(req: Request): string {
  // Include query parameters in cache key
  const query = Object.keys(req.query).length > 0 ? `?${new URLSearchParams(req.query as any).toString()}` : '';
  return `http:${req.method}:${req.path}${query}`;
}

/**
 * Pre-configured caching middleware for common patterns
 */
export const cachingPresets = {
  // Public API responses
  publicApi: cacheResponse({
    ttl: 300, // 5 minutes
    tags: ['api', 'public'],
  }),

  // Static content
  staticContent: cacheResponse({
    ttl: 3600, // 1 hour
    tags: ['static'],
  }),

  // User-specific data (shorter TTL)
  userData: cacheResponse({
    ttl: 180, // 3 minutes
    tags: ['user'],
    condition: (req) => req.method === 'GET' && !!(req as any).user,
  }),

  // Product catalog (longer TTL)
  productCatalog: cacheResponse({
    ttl: 1800, // 30 minutes
    tags: ['products', 'catalog'],
  }),

  // Order status (short TTL)
  orderStatus: cacheResponse({
    ttl: 60, // 1 minute
    tags: ['orders', 'status'],
    condition: (req) => req.path.includes('/orders') && req.method === 'GET',
  }),
};

/**
 * Cache warming utility
 * Pre-populates cache with frequently accessed data
 */
export class CacheWarmer {
  private warmingTasks: Array<() => Promise<void>> = [];

  /**
   * Add a cache warming task
   */
  addTask(task: () => Promise<void>): void {
    this.warmingTasks.push(task);
  }

  /**
   * Execute all cache warming tasks
   */
  async warm(): Promise<void> {
    appLogger.info(`Starting cache warming with ${this.warmingTasks.length} tasks`);

    const results = await Promise.allSettled(
      this.warmingTasks.map(task => task())
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    appLogger.info('Cache warming completed', { successful, failed });

    if (failed > 0) {
      appLogger.warn(`${failed} cache warming tasks failed`);
    }
  }

  /**
   * Clear all warming tasks
   */
  clear(): void {
    this.warmingTasks = [];
  }
}

// Global cache warmer instance
export const cacheWarmer = new CacheWarmer();

export default cacheResponse;
