/**
 * Maysar Engineering — Cache Service with Invalidation Strategy
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 12: Caching and Data Reuse — Every cache must have:
 *     A defined purpose, clear ownership, appropriate expiration,
 *     invalidation strategy, memory constraints, consistency requirements,
 *     failure behaviour, monitoring provisions.
 *   - Article 7: Resource Efficiency Doctrine
 *   - Article 21: Performance Measurement — Cache effectiveness
 * 
 * Implements:
 *   - Tag-based cache invalidation (group related entries)
 *   - Cache stampede protection (probabilistic early expiration)
 *   - Per-cache configuration (TTL, invalidation strategy, memory limits)
 *   - Cache hit/miss monitoring for observability
 *   - Graceful degradation when Redis is unavailable
 */

import { getSharedRedisClient, pingSharedRedis } from '../redis/ioredis-client';

/**
 * Configuration for a named cache.
 */
export interface CacheConfig {
  name: string;
  prefix: string;
  defaultTtlSeconds: number;
  invalidationStrategy: 'ttl' | 'tags' | 'pattern' | 'hybrid';
  maxEntries?: number;
  stampedeProtectionProbability?: number;
  allowDegradation?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  evictions: number;
  errors: number;
}

interface CacheRegistryEntry {
  config: CacheConfig;
  stats: CacheStats;
  tagIndex: Map<string, Set<string>>;
}

export class CacheService {
  private redis: ReturnType<typeof getSharedRedisClient> | null = null;
  private redisAvailable = false;
  private caches = new Map<string, CacheRegistryEntry>();

  registerCache(config: CacheConfig): void {
    this.caches.set(config.name, {
      config,
      stats: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        evictions: 0,
        errors: 0,
      },
      tagIndex: new Map(),
    });
  }

  private getCacheConfig(name: string): CacheRegistryEntry | undefined {
    return this.caches.get(name);
  }

  private ensureRedis(): ReturnType<typeof getSharedRedisClient> | null {
    if (!this.redis) {
      this.redis = getSharedRedisClient();
    }
    return this.redis;
  }

  private async checkRedisAvailability(): Promise<boolean> {
    try {
      this.redisAvailable = await pingSharedRedis();
    } catch {
      this.redisAvailable = false;
    }
    return this.redisAvailable;
  }

  private makeKey(prefix: string, key: string): string {
    return `${prefix}:${key}`;
  }

  private shouldStampedeProtect(probability: number): boolean {
    return Math.random() < probability;
  }

  async get<T>(cacheName: string, key: string): Promise<T | null> {
    const cache = this.getCacheConfig(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' is not registered. Call registerCache() first.`);
    }

    const fullKey = this.makeKey(cache.config.prefix, key);
    cache.stats.totalRequests++;

    const redis = this.ensureRedis();
    if (!redis || !(await this.checkRedisAvailability())) {
      cache.stats.errors++;
      if (cache.config.allowDegradation) {
        cache.stats.misses++;
        cache.stats.hitRate = cache.stats.hits / cache.stats.totalRequests;
        return null;
      }
      throw new Error('Redis unavailable and cache does not allow degradation');
    }

    try {
      const raw = await redis.get(fullKey);
      if (raw === null) {
        cache.stats.misses++;
        cache.stats.hitRate = cache.stats.hits / cache.stats.totalRequests;
        return null;
      }

      const parsed = JSON.parse(raw);
      const now = Date.now();

      if (parsed.expiresAt && now > parsed.expiresAt) {
        await redis.del(fullKey);
        cache.stats.misses++;
        cache.stats.hitRate = cache.stats.hits / cache.stats.totalRequests;
        return null;
      }

      if (
        cache.config.stampedeProtectionProbability &&
        cache.config.stampedeProtectionProbability > 0 &&
        parsed.expiresAt &&
        now > parsed.expiresAt - 60000
      ) {
        if (this.shouldStampedeProtect(cache.config.stampedeProtectionProbability)) {
          cache.stats.misses++;
          cache.stats.hitRate = cache.stats.hits / cache.stats.totalRequests;
          return null;
        }
      }

      cache.stats.hits++;
      cache.stats.hitRate = cache.stats.hits / cache.stats.totalRequests;
      return parsed.value as T;
    } catch (error) {
      cache.stats.errors++;
      if (cache.config.allowDegradation) {
        return null;
      }
      throw error;
    }
  }
  async set<T>(
    cacheName: string,
    key: string,
    value: T,
    options?: {
      ttlSeconds?: number;
      tags?: string[];
    }
  ): Promise<void> {
    const cache = this.getCacheConfig(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' is not registered. Call registerCache() first.`);
    }

    const fullKey = this.makeKey(cache.config.prefix, key);
    const ttl = options?.ttlSeconds ?? cache.config.defaultTtlSeconds;
    const expiresAt = Date.now() + ttl * 1000;

    const redis = this.ensureRedis();
    if (!redis || !(await this.checkRedisAvailability())) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw new Error('Redis unavailable and cache does not allow degradation');
      }
      return;
    }

    try {
      const payload = JSON.stringify({
        value,
        expiresAt,
        createdAt: Date.now(),
        tags: options?.tags ?? [],
      });

      await redis.set(fullKey, payload, 'EX', ttl);

      if (options?.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          let taggedKeys = cache.tagIndex.get(tag);
          if (!taggedKeys) {
            taggedKeys = new Set();
            cache.tagIndex.set(tag, taggedKeys);
          }
          taggedKeys.add(fullKey);
        }
      }

      if (cache.config.maxEntries) {
        const keys = await redis.keys(`${cache.config.prefix}:*`);
        if (keys.length > cache.config.maxEntries) {
          const toEvict = keys.slice(0, keys.length - cache.config.maxEntries);
          if (toEvict.length > 0) {
            await redis.del(...toEvict);
            cache.stats.evictions += toEvict.length;
          }
        }
      }
    } catch (error) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw error;
      }
    }
  }

  async delete(cacheName: string, key: string): Promise<void> {
    const cache = this.getCacheConfig(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' is not registered.`);
    }

    const fullKey = this.makeKey(cache.config.prefix, key);
    const redis = this.ensureRedis();
    if (!redis || !(await this.checkRedisAvailability())) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw new Error('Redis unavailable');
      }
      return;
    }

    try {
      await redis.del(fullKey);
    } catch (error) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw error;
      }
    }
  }

  async invalidateTag(cacheName: string, tag: string): Promise<number> {
    const cache = this.getCacheConfig(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' is not registered.`);
    }

    const taggedKeys = cache.tagIndex.get(tag);
    if (!taggedKeys || taggedKeys.size === 0) {
      return 0;
    }

    const redis = this.ensureRedis();
    if (!redis || !(await this.checkRedisAvailability())) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw new Error('Redis unavailable');
      }
      return 0;
    }

    try {
      const keysArray = Array.from(taggedKeys);
      await redis.del(...keysArray);
      taggedKeys.clear();
      cache.tagIndex.delete(tag);
      return keysArray.length;
    } catch (error) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw error;
      }
      return 0;
    }
  }

  async invalidatePattern(cacheName: string, pattern: string): Promise<number> {
    const cache = this.getCacheConfig(cacheName);
    if (!cache) {
      throw new Error(`Cache '${cacheName}' is not registered.`);
    }

    const redis = this.ensureRedis();
    if (!redis || !(await this.checkRedisAvailability())) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw new Error('Redis unavailable');
      }
      return 0;
    }

    try {
      const keys = await redis.keys(`${cache.config.prefix}:${pattern}`);
      if (keys.length === 0) {
        return 0;
      }
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      cache.stats.errors++;
      if (!cache.config.allowDegradation) {
        throw error;
      }
      return 0;
    }
  }

  getStats(cacheName?: string): CacheStats | Map<string, CacheStats> {
    if (cacheName) {
      const cache = this.getCacheConfig(cacheName);
      if (!cache) {
        throw new Error(`Cache '${cacheName}' is not registered.`);
      }
      return cache.stats;
    }

    const allStats = new Map<string, CacheStats>();
    for (const [name, cache] of this.caches) {
      allStats.set(name, cache.stats);
    }
    return allStats;
  }

  getConfigs(): Map<string, CacheConfig> {
    const configs = new Map<string, CacheConfig>();
    for (const [name, cache] of this.caches) {
      configs.set(name, cache.config);
    }
    return configs;
  }
}

export const cacheService = new CacheService();

export function registerStandardCaches(): void {
  cacheService.registerCache({
    name: 'user-sessions',
    prefix: 'cache:session',
    defaultTtlSeconds: 3600,
    invalidationStrategy: 'ttl',
    allowDegradation: true,
  });

  cacheService.registerCache({
    name: 'product-catalog',
    prefix: 'cache:product',
    defaultTtlSeconds: 1800,
    invalidationStrategy: 'tags',
    stampedeProtectionProbability: 0.1,
    allowDegradation: true,
  });

  cacheService.registerCache({
    name: 'inventory-data',
    prefix: 'cache:inventory',
    defaultTtlSeconds: 300,
    invalidationStrategy: 'hybrid',
    stampedeProtectionProbability: 0.2,
    allowDegradation: true,
  });

  cacheService.registerCache({
    name: 'seller-analytics',
    prefix: 'cache:seller-analytics',
    defaultTtlSeconds: 600,
    invalidationStrategy: 'tags',
    stampedeProtectionProbability: 0.15,
    allowDegradation: true,
  });

  cacheService.registerCache({
    name: 'order-history',
    prefix: 'cache:order',
    defaultTtlSeconds: 900,
    invalidationStrategy: 'hybrid',
    allowDegradation: true,
  });

  cacheService.registerCache({
    name: 'wallet-balances',
    prefix: 'cache:wallet',
    defaultTtlSeconds: 60,
    invalidationStrategy: 'ttl',
    stampedeProtectionProbability: 0.3,
    allowDegradation: false,
  });
}