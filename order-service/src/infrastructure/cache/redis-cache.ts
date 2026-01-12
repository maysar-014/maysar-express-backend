/**
 * Redis Cache Implementation
 * High-performance Redis-based caching with connection pooling and error handling
 */

import Redis from 'ioredis';
import { cacheConfig } from '../../config/monitoring.config';
import { appLogger } from '../monitoring/logger';
import { metricsCollector } from '../monitoring/metrics';
import { circuitBreakerRegistry, CircuitBreakerPresets } from '../circuit-breaker';

export interface CacheOptions {
  ttl?: number;        // Time to live in seconds
  tags?: string[];     // Cache tags for invalidation
  compress?: boolean;  // Whether to compress the value
}

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

/**
 * Redis Cache Implementation
 */
export class RedisCache {
  name = 'redis';
  private redis: Redis;
  private isConnected: boolean = false;
  private circuitBreaker = circuitBreakerRegistry.getBreaker('redis-cache', CircuitBreakerPresets.CACHE);

  constructor() {
    this.redis = new Redis({
      host: cacheConfig.redis.host,
      port: cacheConfig.redis.port,
      password: cacheConfig.redis.password,
      db: cacheConfig.redis.db || 0,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keyPrefix: cacheConfig.redis.keyPrefix,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      appLogger.info('Redis cache connected');
      metricsCollector.updateDatabaseConnections('redis', 1);
    });

    this.redis.on('disconnect', () => {
      this.isConnected = false;
      appLogger.warn('Redis cache disconnected');
      metricsCollector.updateDatabaseConnections('redis', 0);
    });

    this.redis.on('error', (error) => {
      appLogger.error('Redis cache error', error);
      metricsCollector.recordDatabaseQuery('redis_error', 'system', 0, false, error.message);
    });

    this.redis.on('ready', () => {
      appLogger.info('Redis cache ready');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      this.isConnected = true;
    } catch (error) {
      appLogger.error('Failed to connect to Redis cache', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
    } catch (error) {
      appLogger.error('Error disconnecting from Redis cache', error);
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * Get value from cache with circuit breaker protection
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();

    const result = await this.circuitBreaker.execute(async () => {
      try {
        const serialized = await this.redis.get(key);
        if (!serialized) {
          metricsCollector.recordDatabaseQuery('redis_get', 'cache', Date.now() - startTime, true);
          return null;
        }

        const entry: CacheEntry<T> = JSON.parse(serialized);

        // Check if entry has expired
        if (Date.now() > entry.timestamp + (entry.ttl * 1000)) {
          await this.delete(key); // Clean up expired entry
          metricsCollector.recordDatabaseQuery('redis_get', 'cache', Date.now() - startTime, true);
          return null;
        }

        metricsCollector.recordDatabaseQuery('redis_get', 'cache', Date.now() - startTime, true);
        return entry.value;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_get', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return result.success ? result.data || null : null;
  }

  /**
   * Set value in cache with circuit breaker protection
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    const ttl = options.ttl || cacheConfig.defaultTTL;

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      tags: options.tags,
    };

    const result = await this.circuitBreaker.execute(async () => {
      try {
        const serialized = JSON.stringify(entry);
        await this.redis.setex(key, ttl, serialized);

        // Store tag-key mappings for invalidation
        if (options.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, key);
          }
        }

        metricsCollector.recordDatabaseQuery('redis_set', 'cache', Date.now() - startTime, true);
        return true;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_set', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return result.success;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();

    const result = await this.circuitBreaker.execute(async () => {
      try {
        // Get tags before deleting
        const serialized = await this.redis.get(key);
        if (serialized) {
          const entry: CacheEntry = JSON.parse(serialized);
          if (entry.tags) {
            for (const tag of entry.tags) {
              await this.redis.srem(`tag:${tag}`, key);
            }
          }
        }

        const deleted = await this.redis.del(key);
        metricsCollector.recordDatabaseQuery('redis_delete', 'cache', Date.now() - startTime, true);
        return deleted > 0;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_delete', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return result.success;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const startTime = Date.now();

    const result = await this.circuitBreaker.execute(async () => {
      try {
        const exists = await this.redis.exists(key);
        metricsCollector.recordDatabaseQuery('redis_exists', 'cache', Date.now() - startTime, true);
        return exists === 1;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_exists', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return !!(result.success && result.data);
  }

  /**
   * Increment numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number | null> {
    const startTime = Date.now();

    const result = await this.circuitBreaker.execute(async () => {
      try {
        const value = await this.redis.incrby(key, amount);
        metricsCollector.recordDatabaseQuery('redis_increment', 'cache', Date.now() - startTime, true);
        return value;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_increment', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return result.success ? result.data : null;
  }

  /**
   * Set expiration time for key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const startTime = Date.now();

    const result = await this.circuitBreaker.execute(async () => {
      try {
        const success = await this.redis.expire(key, ttl);
        metricsCollector.recordDatabaseQuery('redis_expire', 'cache', Date.now() - startTime, true);
        return success === 1;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_expire', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return result.success ? result.data : false;
  }

  /**
   * Get time to live for key
   */
  async ttl(key: string): Promise<number> {
    const startTime = Date.now();

    const result = await this.circuitBreaker.execute(async () => {
      try {
        const ttl = await this.redis.ttl(key);
        metricsCollector.recordDatabaseQuery('redis_ttl', 'cache', Date.now() - startTime, true);
        return ttl;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_ttl', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return result.success ? result.data : -2; // -2 indicates key doesn't exist
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    const startTime = Date.now();
    let totalDeleted = 0;

    const result = await this.circuitBreaker.execute(async () => {
      try {
        for (const tag of tags) {
          const keys = await this.redis.smembers(`tag:${tag}`);
          if (keys.length > 0) {
            const deleted = await this.redis.del(...keys);
            totalDeleted += deleted;

            // Remove the tag set
            await this.redis.del(`tag:${tag}`);
          }
        }

        metricsCollector.recordDatabaseQuery('redis_invalidate_tags', 'cache', Date.now() - startTime, true);
        return totalDeleted;

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_invalidate_tags', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    return result.success ? result.data : 0;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const startTime = Date.now();

    const result = await this.circuitBreaker.execute(async () => {
      try {
        // Get all keys with our prefix
        const keys = await this.redis.keys('order_service:*');

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

        metricsCollector.recordDatabaseQuery('redis_clear', 'cache', Date.now() - startTime, true);

      } catch (error) {
        metricsCollector.recordDatabaseQuery('redis_clear', 'cache', Date.now() - startTime, false, (error as Error).message);
        throw error;
      }
    });

    if (!result.success) {
      throw result.error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    dbSize: number;
    memoryUsage: any;
    hitRate?: number;
  }> {
    const stats = {
      connected: this.isReady(),
      dbSize: 0,
      memoryUsage: null,
    };

    if (this.isReady()) {
      try {
        stats.dbSize = await this.redis.dbsize();
        stats.memoryUsage = await this.redis.info('memory');
      } catch (error) {
        appLogger.error('Failed to get Redis stats', error);
      }
    }

    return stats;
  }

  /**
   * Health check for Redis
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Global Redis cache instance
export const redisCache = new RedisCache();
