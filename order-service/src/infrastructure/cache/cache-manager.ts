/**
 * Cache Manager
 * Unified interface for multi-level caching with cache-aside pattern
 */

import { redisCache, RedisCache } from './redis-cache';
import { appLogger } from '../monitoring/logger';
import { metricsCollector } from '../monitoring/metrics';

export interface CacheStrategy {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: any): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  isReady(): boolean;
}

export interface CacheManagerOptions {
  strategies: CacheStrategy[];
  defaultTTL: number;
  enableCacheAside: boolean;
  enableWriteThrough: boolean;
  enableWriteBehind: boolean;
}

/**
 * Memory Cache Strategy (L1 Cache)
 */
export class MemoryCache implements CacheStrategy {
  name = 'memory';
  private cache = new Map<string, { value: any; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, options?: { ttl?: number }): Promise<boolean> {
    const ttl = options?.ttl || 300; // 5 minutes default
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000),
    });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  isReady(): boolean {
    return true;
  }
}

/**
 * Cache Manager with Multi-Level Caching
 */
export class CacheManager {
  private strategies: CacheStrategy[] = [];
  private options: CacheManagerOptions;

  constructor(options: Partial<CacheManagerOptions> = {}) {
    this.options = {
      strategies: [new MemoryCache(), redisCache],
      defaultTTL: 3600,
      enableCacheAside: true,
      enableWriteThrough: false,
      enableWriteBehind: false,
      ...options,
    };

    this.strategies = this.options.strategies;
  }

  /**
   * Get value using cache-aside pattern
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.options.enableCacheAside) {
      return null;
    }

    // Try L1 cache first (memory)
    for (const strategy of this.strategies) {
      if (!strategy.isReady()) continue;

      try {
        const value = await strategy.get<T>(key);
        if (value !== null) {
          metricsCollector.recordDatabaseQuery('cache_hit', strategy.name, 0, true);
          return value;
        }
      } catch (error) {
        appLogger.warn(`Cache strategy ${strategy.name} failed for key ${key}`, { error: (error as Error).message });
      }
    }

    metricsCollector.recordDatabaseQuery('cache_miss', 'all', 0, true);
    return null;
  }

  /**
   * Set value in all cache layers
   */
  async set<T = any>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
      skipMemory?: boolean;
    } = {}
  ): Promise<boolean> {
    const ttl = options.ttl || this.options.defaultTTL;
    let success = false;

    // Set in all strategies
    for (const strategy of this.strategies) {
      if (!strategy.isReady()) continue;

      // Skip memory cache if requested (for large objects)
      if (options.skipMemory && strategy.name === 'memory') continue;

      try {
        const result = await strategy.set(key, value, { ttl, tags: options.tags });
        if (result) success = true;
      } catch (error) {
        appLogger.warn(`Failed to set cache in ${strategy.name} for key ${key}`, { error: (error as Error).message });
      }
    }

    return success;
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<boolean> {
    let success = false;

    for (const strategy of this.strategies) {
      if (!strategy.isReady()) continue;

      try {
        const result = await strategy.delete(key);
        if (result) success = true;
      } catch (error) {
        appLogger.warn(`Failed to delete cache in ${strategy.name} for key ${key}`, { error: (error as Error).message });
      }
    }

    return success;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalDeleted = 0;

    for (const strategy of this.strategies) {
      if (!strategy.isReady() || strategy.name === 'memory') continue;

      try {
        if (strategy instanceof RedisCache) {
          const deleted = await strategy.invalidateByTags(tags);
          totalDeleted += deleted;
        }
      } catch (error) {
        appLogger.warn(`Failed to invalidate tags in ${strategy.name}`, { tags, error: (error as Error).message });
      }
    }

    return totalDeleted;
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    for (const strategy of this.strategies) {
      if (!strategy.isReady()) continue;

      try {
        await strategy.clear();
      } catch (error) {
        appLogger.warn(`Failed to clear cache in ${strategy.name}`, { error: (error as Error).message });
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    strategies: Array<{
      name: string;
      ready: boolean;
      stats?: any;
    }>;
  }> {
    const strategies = await Promise.all(
      this.strategies.map(async (strategy) => {
        let stats = undefined;
        if (strategy instanceof RedisCache) {
          stats = await strategy.getStats();
        }

        return {
          name: strategy.name,
          ready: strategy.isReady(),
          stats,
        };
      })
    );

    return { strategies };
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<boolean> {
    // At least one strategy should be ready
    return this.strategies.some(strategy => strategy.isReady());
  }

  /**
   * Cache-aside pattern for database operations
   */
  async cacheAside<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    if (!this.options.enableCacheAside) {
      return fetcher();
    }

    // Try to get from cache first
    if (!options.forceRefresh) {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch from source
    try {
      const data = await fetcher();

      // Cache the result
      await this.set(key, data, {
        ttl: options.ttl,
        tags: options.tags,
      });

      return data;
    } catch (error) {
      appLogger.error(`Failed to fetch and cache data for key ${key}`, error);
      throw error;
    }
  }

  /**
   * Write-through pattern (not implemented - would need database integration)
   */
  async writeThrough<T>(
    key: string,
    value: T,
    writer: (value: T) => Promise<void>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    if (!this.options.enableWriteThrough) {
      throw new Error('Write-through caching is not enabled');
    }

    // This would write to database first, then cache
    // Implementation depends on specific use case
    throw new Error('Write-through caching not implemented');
  }

  /**
   * Write-behind pattern (not implemented - would need queue system)
   */
  async writeBehind<T>(
    key: string,
    value: T,
    writer: (value: T) => Promise<void>,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    if (!this.options.enableWriteBehind) {
      throw new Error('Write-behind caching is not enabled');
    }

    // This would write to cache first, then queue for database write
    // Implementation depends on queue system
    throw new Error('Write-behind caching not implemented');
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

// Convenience functions
export async function getCache<T = any>(key: string): Promise<T | null> {
  return cacheManager.get<T>(key);
}

export async function setCache<T = any>(
  key: string,
  value: T,
  options?: { ttl?: number; tags?: string[] }
): Promise<boolean> {
  return cacheManager.set(key, value, options);
}

export async function deleteCache(key: string): Promise<boolean> {
  return cacheManager.delete(key);
}

export async function invalidateCacheTags(tags: string[]): Promise<number> {
  return cacheManager.invalidateByTags(tags);
}

export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; tags?: string[]; forceRefresh?: boolean }
): Promise<T> {
  return cacheManager.cacheAside(key, fetcher, options);
}

export default cacheManager;
