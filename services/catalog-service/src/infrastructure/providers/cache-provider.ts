/**
 * Cache Provider Implementation
 * Infrastructure layer cache implementations for performance optimization
 * Supports multiple cache backends (Redis, Memory, Memcached) with unified interface
 */

import { CacheService } from '../../domain/interfaces';

/**
 * Cache Provider Types
 * Different cache backend implementations
 */
export enum CacheProvider {
  MEMORY = 'memory',        // In-memory cache for development/testing
  REDIS = 'redis',         // Redis for distributed caching
  MEMCACHED = 'memcached', // Memcached for high-performance caching
  HYBRID = 'hybrid'        // Multi-level caching (L1 memory + L2 Redis)
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  provider: CacheProvider;
  ttl: number;              // Default TTL in seconds
  maxSize?: number;         // Max cache size (for memory cache)
  keyPrefix?: string;       // Key prefix for namespacing
  redisUrl?: string;        // Redis connection URL
  memcachedServers?: string[]; // Memcached server list
  enableCompression?: boolean; // Compress cached values
  enableMetrics?: boolean;  // Collect cache metrics
  enableSerialization?: boolean; // JSON serialization
}

/**
 * Cache Entry Metadata
 */
interface CacheEntry {
  value: any;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

/**
 * Memory Cache Implementation
 * Simple in-memory LRU cache for development and testing
 */
export class MemoryCacheProvider implements CacheService {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalSize: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      provider: CacheProvider.MEMORY,
      ttl: 300, // 5 minutes
      maxSize: 1000,
      keyPrefix: '',
      enableCompression: false,
      enableMetrics: true,
      enableSerialization: true,
      ...config
    };
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      if (this.config.enableMetrics) this.metrics.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey);
      if (this.config.enableMetrics) {
        this.metrics.misses++;
        this.metrics.evictions++;
      }
      return null;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    if (this.config.enableMetrics) this.metrics.hits++;

    return this.deserialize(entry.value) as T;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const serializedValue = this.serialize(value);
    const expiresAt = Date.now() + (ttl || this.config.ttl) * 1000;
    const size = this.calculateSize(serializedValue);

    // Check size limits
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry = {
      value: serializedValue,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size
    };

    this.cache.set(fullKey, entry);
    this.metrics.totalSize += size;

    if (this.config.enableMetrics) this.metrics.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (entry) {
      this.cache.delete(fullKey);
      this.metrics.totalSize -= entry.size;
      if (this.config.enableMetrics) this.metrics.deletes++;
      return true;
    }

    return false;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics.totalSize = 0;
    if (this.config.enableMetrics) {
      this.metrics.deletes += this.cache.size;
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    totalRequests: number;
    evictions: number;
    entries: Array<{ key: string; size: number; accessCount: number; age: number }>;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;

    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.replace(this.config.keyPrefix!, ''),
      size: entry.size,
      accessCount: entry.accessCount,
      age: Date.now() - entry.createdAt
    }));

    return {
      size: this.cache.size,
      hitRate,
      totalRequests,
      evictions: this.metrics.evictions,
      entries
    };
  }

  private getFullKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  private serialize(value: any): string {
    if (!this.config.enableSerialization) return value;
    return JSON.stringify(value);
  }

  private deserialize(value: string): any {
    if (!this.config.enableSerialization) return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private calculateSize(value: any): number {
    if (typeof value === 'string') return value.length;
    return JSON.stringify(value).length;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.metrics.totalSize -= entry.size;
        this.metrics.evictions++;
      }
      this.cache.delete(oldestKey);
    }
  }
}

/**
 * Redis Cache Implementation
 * Redis-based distributed caching for production use
 */
export class RedisCacheProvider implements CacheService {
  private redisClient?: any;
  private config: CacheConfig;
  private connected = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      provider: CacheProvider.REDIS,
      ttl: 300,
      keyPrefix: '',
      enableCompression: false,
      enableMetrics: true,
      enableSerialization: true,
      redisUrl: 'redis://localhost:6379',
      ...config
    };

    this.initializeRedis();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.redisClient) return null;

    try {
      const fullKey = this.getFullKey(key);
      const value = await this.redisClient.get(fullKey);

      if (!value) return null;

      return this.deserialize(value) as T;
    } catch (error) {
      console.error('Redis cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.connected || !this.redisClient) {
      throw new Error('Redis cache not available');
    }

    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = this.serialize(value);
      const expiryTime = ttl || this.config.ttl;

      await this.redisClient.setex(fullKey, expiryTime, serializedValue);
    } catch (error) {
      console.error('Redis cache set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.connected || !this.redisClient) return false;

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.redisClient.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Redis cache delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.connected || !this.redisClient) return;

    try {
      // Clear all keys with our prefix
      const pattern = this.getFullKey('*');
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected || !this.redisClient) return false;

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.redisClient.exists(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Redis cache exists error:', error);
      return false;
    }
  }

  /**
   * Get Redis-specific operations
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    if (!this.connected || !this.redisClient) return {};

    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const values = await this.redisClient.mget(fullKeys);

      const result: Record<string, any> = {};
      keys.forEach((key, index) => {
        if (values[index]) {
          result[key] = this.deserialize(values[index]);
        }
      });

      return result;
    } catch (error) {
      console.error('Redis cache mget error:', error);
      return {};
    }
  }

  async setMultiple(entries: Record<string, any>, ttl?: number): Promise<void> {
    if (!this.connected || !this.redisClient) return;

    try {
      const pipeline = this.redisClient.multi();
      const expiryTime = ttl || this.config.ttl;

      for (const [key, value] of Object.entries(entries)) {
        const fullKey = this.getFullKey(key);
        const serializedValue = this.serialize(value);
        pipeline.setex(fullKey, expiryTime, serializedValue);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Redis cache mset error:', error);
      throw error;
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      const Redis = require('ioredis');
      this.redisClient = new Redis(this.config.redisUrl, {
        lazyConnect: true,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3
      });

      await this.redisClient.connect();
      this.connected = true;
      console.log('Redis cache connection established');

      this.redisClient.on('error', (err: Error) => {
        console.error('Redis connection error:', err);
        this.connected = false;
      });

      this.redisClient.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });
    } catch (error) {
      console.error('Failed to connect to Redis cache:', error);
      this.connected = false;
    }
  }

  private getFullKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  private serialize(value: any): string {
    if (!this.config.enableSerialization) return value;
    return JSON.stringify(value);
  }

  private deserialize(value: string): any {
    if (!this.config.enableSerialization) return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

/**
 * Hybrid Cache Implementation
 * Multi-level caching with L1 (memory) and L2 (Redis) layers
 */
export class HybridCacheProvider implements CacheService {
  private l1Cache: MemoryCacheProvider;
  private l2Cache: RedisCacheProvider;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      provider: CacheProvider.HYBRID,
      ttl: 300,
      maxSize: 500, // Smaller L1 cache
      keyPrefix: '',
      enableCompression: false,
      enableMetrics: true,
      enableSerialization: true,
      ...config
    };

    // L1 cache with shorter TTL
    this.l1Cache = new MemoryCacheProvider({
      ...this.config,
      maxSize: this.config.maxSize,
      ttl: Math.floor(this.config.ttl * 0.1) // 10% of main TTL
    });

    // L2 cache with full TTL
    this.l2Cache = new RedisCacheProvider(this.config);
  }

  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    let value = await this.l1Cache.get<T>(key);
    if (value !== null) {
      return value;
    }

    // Try L2 cache
    value = await this.l2Cache.get<T>(key);
    if (value !== null) {
      // Populate L1 cache for faster future access
      await this.l1Cache.set(key, value, Math.floor(this.config.ttl * 0.1));
      return value;
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiryTime = ttl || this.config.ttl;

    // Set in both caches
    await Promise.all([
      this.l1Cache.set(key, value, Math.floor(expiryTime * 0.1)),
      this.l2Cache.set(key, value, expiryTime)
    ]);
  }

  async delete(key: string): Promise<boolean> {
    const [l1Result, l2Result] = await Promise.all([
      this.l1Cache.delete(key),
      this.l2Cache.delete(key)
    ]);

    return l1Result || l2Result;
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.l1Cache.clear(),
      this.l2Cache.clear()
    ]);
  }

  async exists(key: string): Promise<boolean> {
    // Check L1 first, then L2
    const l1Exists = await this.l1Cache.exists(key);
    if (l1Exists) return true;

    return await this.l2Cache.exists(key);
  }

  /**
   * Get hybrid cache statistics
   */
  getStats(): {
    l1: any;
    l2: any;
    combined: {
      hitRate: number;
      totalRequests: number;
    };
  } {
    const l1Stats = this.l1Cache.getStats();

    return {
      l1: l1Stats,
      l2: { /* Redis stats would be collected separately */ },
      combined: {
        hitRate: l1Stats.hitRate,
        totalRequests: l1Stats.totalRequests
      }
    };
  }
}

/**
 * Cache Provider Factory
 * Factory for creating cache provider instances
 */
export class CacheProviderFactory {
  private static instance: CacheService | null = null;

  static createMemory(config: Partial<CacheConfig> = {}): MemoryCacheProvider {
    return new MemoryCacheProvider({
      provider: CacheProvider.MEMORY,
      ...config
    });
  }

  static createRedis(config: Partial<CacheConfig> = {}): RedisCacheProvider {
    return new RedisCacheProvider({
      provider: CacheProvider.REDIS,
      ...config
    });
  }

  static createHybrid(config: Partial<CacheConfig> = {}): HybridCacheProvider {
    return new HybridCacheProvider({
      provider: CacheProvider.HYBRID,
      ...config
    });
  }

  static createDefault(config: Partial<CacheConfig> = {}): CacheService {
    const provider = process.env.CACHE_PROVIDER || CacheProvider.MEMORY;

    switch (provider) {
      case CacheProvider.REDIS:
        return this.createRedis(config);
      case CacheProvider.HYBRID:
        return this.createHybrid(config);
      case CacheProvider.MEMORY:
      default:
        return this.createMemory(config);
    }
  }

  static getInstance(): CacheService | null {
    return this.instance;
  }

  static setInstance(cache: CacheService): void {
    if (this.instance) {
      throw new Error('Cache provider instance already exists');
    }
    this.instance = cache;
  }
}

/**
 * Cached Repository Decorator
 * Higher-order function to add caching to repository methods
 */
export class CachedRepository {
  constructor(private cache: CacheService, private cacheConfig: CacheConfig) {}

  /**
   * Cache-enabled get operation
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetcher();

    // Cache the result
    await this.cache.set(key, value, ttl || this.cacheConfig.ttl);

    return value;
  }

  /**
   * Cache invalidation helper
   */
  async invalidate(pattern: string): Promise<void> {
    // In a real implementation, you would need to handle pattern-based cache invalidation
    // For now, we'll clear the entire cache
    await this.cache.clear();
  }

  /**
   * Cache warming helper
   */
  async warmCache<T>(
    keys: Array<{ key: string; fetcher: () => Promise<T> }>,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async ({ key, fetcher }) => {
      try {
        const value = await fetcher();
        await this.cache.set(key, value, ttl || this.cacheConfig.ttl);
      } catch (error) {
        console.error(`Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }
}

/**
 * Cache Key Generators
 * Utility functions for generating consistent cache keys
 */
export class CacheKeyGenerator {
  static product = {
    byId: (id: string) => `product:id:${id}`,
    bySeller: (sellerId: string, page?: number, limit?: number) =>
      `product:seller:${sellerId}:page:${page || 1}:limit:${limit || 20}`,
    byCategory: (categoryId: string, page?: number, limit?: number) =>
      `product:category:${categoryId}:page:${page || 1}:limit:${limit || 20}`,
    search: (query: string, filters: any, page?: number, limit?: number) =>
      `product:search:${query}:filters:${JSON.stringify(filters)}:page:${page || 1}:limit:${limit || 20}`
  };

  static category = {
    byId: (id: string) => `category:id:${id}`,
    all: () => `category:all`,
    byParent: (parentId: string) => `category:parent:${parentId}`,
    tree: () => `category:tree`
  };

  static seller = {
    byId: (id: string) => `seller:id:${id}`,
    byEmail: (email: string) => `seller:email:${email}`,
    products: (sellerId: string) => `seller:products:${sellerId}`
  };

  static pricing = {
    rules: (productId?: string) => productId ? `pricing:rules:${productId}` : `pricing:rules`,
    calculation: (productId: string, context: any) =>
      `pricing:calc:${productId}:${JSON.stringify(context)}`
  };

  static search = {
    results: (query: string, filters: any, pagination: any) =>
      `search:results:${query}:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`,
    suggestions: (query: string) => `search:suggestions:${query}`,
    facets: (query: string, filters: any) =>
      `search:facets:${query}:${JSON.stringify(filters)}`
  };
}
