// @ts-nocheck
/**
 * Cache Service Implementation
 * Infrastructure layer distributed caching and cache management
 * Advanced caching with invalidation strategies, warming, and monitoring
 */

import { CacheService as ICacheService } from '../../domain/interfaces';
import {
  CacheProviderFactory,
  MemoryCacheProvider,
  RedisCacheProvider,
  HybridCacheProvider,
  CacheKeyGenerator,
  CachedRepository
} from '../providers/cache-provider';
import { scanKeysIoredis } from '@shared/redis/scan-keys';

/**
 * Cache Service Configuration
 */
export interface CacheServiceConfig {
  provider: 'memory' | 'redis' | 'hybrid';
  defaultTtl: number; // seconds
  maxMemorySize?: number; // for memory cache
  redisUrl?: string;
  keyPrefix: string;
  enableMetrics: boolean;
  enableCompression: boolean;
  enableSerialization: boolean;
  cacheWarming: {
    enabled: boolean;
    interval: number; // milliseconds
    batchSize: number;
  };
  invalidation: {
    enabled: boolean;
    patterns: string[];
    cascadeDelete: boolean;
  };
}

/**
 * Default Cache Service Configuration
 */
export const DEFAULT_CACHE_SERVICE_CONFIG: CacheServiceConfig = {
  provider: 'memory',
  defaultTtl: 300, // 5 minutes
  keyPrefix: 'catalog',
  enableMetrics: true,
  enableCompression: false,
  enableSerialization: true,
  cacheWarming: {
    enabled: false,
    interval: 3600000, // 1 hour
    batchSize: 100
  },
  invalidation: {
    enabled: true,
    patterns: ['product:*', 'category:*', 'search:*'],
    cascadeDelete: true
  }
};

/**
 * Cache Entry Metadata
 */
export interface CacheEntryMetadata {
  key: string;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  tags: string[];
}

/**
 * Cache Warming Task
 */
export interface CacheWarmingTask {
  id: string;
  name: string;
  priority: number;
  execute: () => Promise<Array<{ key: string; data: any; ttl?: number }>>;
  dependencies?: string[];
}

/**
 * Cache Invalidation Rule
 */
export interface CacheInvalidationRule {
  pattern: string;
  action: 'delete' | 'update' | 'refresh';
  cascade: boolean;
  priority: number;
}

/**
 * Cache Analytics Data
 */
export interface CacheAnalytics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageResponseTime: number;
  totalEvictions: number;
  totalSize: number;
  entriesByTag: Record<string, number>;
  topAccessedKeys: Array<{ key: string; accessCount: number }>;
  timestamp: Date;
}

/**
 * Distributed Cache Service
 * Advanced caching with warming, invalidation, and analytics
 */
export class DistributedCacheService implements ICacheService {
  private cache: ICacheService;
  private config: CacheServiceConfig;
  private warmingTasks = new Map<string, CacheWarmingTask>();
  private invalidationRules: CacheInvalidationRule[] = [];
  private cacheTags = new Map<string, Set<string>>(); // tag -> keys mapping
  private keyTags = new Map<string, Set<string>>(); // key -> tags mapping
  private cacheKeys = new Set<string>();
  private warmingInterval?: NodeJS.Timeout;
  private analytics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalResponseTime: 0,
    evictions: 0,
    totalSize: 0
  };

  constructor(config: Partial<CacheServiceConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_SERVICE_CONFIG, ...config };
    this.cache = this.initializeCacheProvider();
    this.initializeDefaultInvalidationRules();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    const fullKey = this.getFullKey(key);

    try {
      const value = await this.cache.get<T>(fullKey);

      this.updateAnalytics(value !== null, Date.now() - startTime);

      if (value !== null && this.keyTags.has(fullKey)) {
        // Update last accessed time for tagged keys
        // In a real implementation, this would update metadata
      }

      return value;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number, tags?: string[]): Promise<void> {
    const startTime = Date.now();
    const fullKey = this.getFullKey(key);
    const expiryTime = ttl || this.config.defaultTtl;

    try {
      await this.cache.set(fullKey, value, expiryTime);
      this.cacheKeys.add(fullKey);

      // Handle tags
      if (tags && tags.length > 0) {
        this.addTagsToKey(fullKey, tags);
      }

      // Update size analytics
      const size = this.calculateEntrySize(value);
      this.analytics.totalSize += size;

    } catch (error) {
      this.updateAnalytics(false, Date.now() - startTime);
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);

    try {
      const deleted = await this.cache.delete(fullKey);

      if (deleted) {
        // Remove tags association
        this.removeKeyFromTags(fullKey);
        this.keyTags.delete(fullKey);
        this.cacheKeys.delete(fullKey);
      }

      return deleted;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);

    try {
      return await this.cache.exists(fullKey);
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      this.cacheTags.clear();
      this.keyTags.clear();
      this.cacheKeys.clear();
      this.analytics.totalSize = 0;
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Get multiple values from cache
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    if (this.cache instanceof RedisCacheProvider && 'getMultiple' in this.cache) {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const result = await (this.cache as any).getMultiple(fullKeys);

      // Update analytics for each key
      keys.forEach(key => {
        const fullKey = this.getFullKey(key);
        const hasValue = result[key] !== undefined;
        this.updateAnalytics(hasValue, 0); // Approximate response time
      });

      return result;
    }

    // Fallback to individual gets
    const result: Record<string, T> = {};
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          result[key] = value;
        }
      })
    );

    return result;
  }

  /**
   * Set multiple values in cache
   */
  async setMultiple(entries: Record<string, any>, ttl?: number, tags?: string[]): Promise<void> {
    if (this.cache instanceof RedisCacheProvider && 'setMultiple' in this.cache) {
      const fullEntries: Record<string, any> = {};
      for (const [key, value] of Object.entries(entries)) {
        const fullKey = this.getFullKey(key);
        fullEntries[fullKey] = value;
        this.cacheKeys.add(fullKey);
      }

      await (this.cache as any).setMultiple(fullEntries, ttl);
    } else {
      // Fallback to individual sets
      await Promise.all(
        Object.entries(entries).map(([key, value]) =>
          this.set(key, value, ttl, tags)
        )
      );
    }

    // Apply tags to all entries if provided
    if (tags && tags.length > 0) {
      for (const key of Object.keys(entries)) {
        const fullKey = this.getFullKey(key);
        this.addTagsToKey(fullKey, tags);
        this.cacheKeys.add(fullKey);
      }
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalDeleted = 0;

    for (const tag of tags) {
      const keys = this.cacheTags.get(tag);
      if (keys) {
        for (const key of keys) {
          const deleted = await this.cache.delete(key);
          if (deleted) {
            totalDeleted++;
            this.removeKeyFromTags(key);
            this.keyTags.delete(key);
            this.cacheKeys.delete(key);
          }
        }
        this.cacheTags.delete(tag);
      }
    }

    return totalDeleted;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let totalDeleted = 0;
    const fullPattern = this.getFullKey(pattern);

    if (this.cache instanceof RedisCacheProvider) {
      const redisClient = (this.cache as any).redisClient;
      if (redisClient) {
        const keys = await scanKeysIoredis(redisClient, fullPattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
          totalDeleted = keys.length;
          keys.forEach((key: string) => {
            this.removeKeyFromTags(key);
            this.keyTags.delete(key);
            this.cacheKeys.delete(key);
          });
        }
        return totalDeleted;
      }
    }

    for (const key of this.cacheKeys) {
      if (this.matchesPattern(key, fullPattern)) {
        const deleted = await this.cache.delete(key);
        if (deleted) {
          totalDeleted++;
          this.removeKeyFromTags(key);
          this.keyTags.delete(key);
          this.cacheKeys.delete(key);
        }
      }
    }

    return totalDeleted;
  }

  /**
   * Apply invalidation rules
   */
  async applyInvalidationRules(triggerKey: string, action: string): Promise<void> {
    for (const rule of this.invalidationRules) {
      if (this.matchesPattern(triggerKey, rule.pattern)) {
        switch (rule.action) {
          case 'delete':
            await this.invalidateByPattern(rule.pattern);
            break;
          case 'update':
            // Trigger cache warming for affected patterns
            await this.warmCacheByPattern(rule.pattern);
            break;
          case 'refresh':
            await this.invalidateByPattern(rule.pattern);
            await this.warmCacheByPattern(rule.pattern);
            break;
        }
      }
    }
  }

  /**
   * Add cache warming task
   */
  addWarmingTask(task: CacheWarmingTask): void {
    this.warmingTasks.set(task.id, task);
  }

  /**
   * Remove cache warming task
   */
  removeWarmingTask(taskId: string): boolean {
    return this.warmingTasks.delete(taskId);
  }

  /**
   * Execute cache warming
   */
  async warmCache(taskIds?: string[]): Promise<void> {
    const tasks = taskIds
      ? taskIds.map(id => this.warmingTasks.get(id)).filter(Boolean)
      : Array.from(this.warmingTasks.values());

    // Sort by priority
    tasks.sort((a, b) => (a!.priority - b!.priority));

    for (const task of tasks) {
      if (!task) continue;

      try {
        console.log(`Executing cache warming task: ${task.name}`);
        const entries = await task.execute();

        // Batch set entries
        for (let i = 0; i < entries.length; i += this.config.cacheWarming.batchSize) {
          const batch = entries.slice(i, i + this.config.cacheWarming.batchSize);
          const batchEntries: Record<string, any> = {};

          for (const entry of batch) {
            batchEntries[entry.key] = entry.data;
          }

          await this.setMultiple(batchEntries, undefined, [`warming:${task.id}`]);
        }

        console.log(`Cache warming task ${task.name} completed: ${entries.length} entries`);
      } catch (error) {
        console.error(`Cache warming task ${task.name} failed:`, error);
      }
    }
  }

  /**
   * Start periodic cache warming
   */
  startPeriodicWarming(): void {
    if (!this.config.cacheWarming.enabled || this.warmingInterval) {
      return;
    }

    console.log(`Starting periodic cache warming every ${this.config.cacheWarming.interval}ms`);

    this.warmingInterval = setInterval(async () => {
      try {
        await this.warmCache();
      } catch (error) {
        console.error('Periodic cache warming failed:', error);
      }
    }, this.config.cacheWarming.interval);
  }

  /**
   * Stop periodic cache warming
   */
  stopPeriodicWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = undefined;
      console.log('Stopped periodic cache warming');
    }
  }

  /**
   * Get cache analytics
   */
  getAnalytics(): CacheAnalytics {
    const hitRate = this.analytics.totalRequests > 0
      ? this.analytics.cacheHits / this.analytics.totalRequests
      : 0;

    const averageResponseTime = this.analytics.totalRequests > 0
      ? this.analytics.totalResponseTime / this.analytics.totalRequests
      : 0;

    // Get entries by tag
    const entriesByTag: Record<string, number> = {};
    for (const [tag, keys] of this.cacheTags) {
      entriesByTag[tag] = keys.size;
    }

    // Get top accessed keys (simplified - would need proper tracking)
    const topAccessedKeys: Array<{ key: string; accessCount: number }> = [];

    return {
      totalRequests: this.analytics.totalRequests,
      cacheHits: this.analytics.cacheHits,
      cacheMisses: this.analytics.cacheMisses,
      hitRate,
      averageResponseTime,
      totalEvictions: this.analytics.evictions,
      totalSize: this.analytics.totalSize,
      entriesByTag,
      topAccessedKeys,
      timestamp: new Date()
    };
  }

  /**
   * Create cached repository wrapper
   */
  createCachedRepository<T>(
    repository: T,
    config: Partial<CacheServiceConfig> = {}
  ): CachedRepository {
    const cacheConfig = { ...this.config, ...config };
    return new CachedRepository(this, cacheConfig);
  }

  /**
   * Export cache data for backup
   */
  async exportCache(): Promise<Record<string, any>> {
    // In a real implementation, this would export all cache data
    // For now, return metadata
    return {
      config: this.config,
      analytics: this.getAnalytics(),
      tags: Object.fromEntries(this.cacheTags),
      timestamp: new Date()
    };
  }

  /**
   * Import cache data from backup
   */
  async importCache(data: Record<string, any>): Promise<void> {
    // In a real implementation, this would restore cache data
    console.log('Cache import not implemented');
  }

  /**
   * Get cache keys by tag
   */
  getKeysByTag(tag: string): string[] {
    const keys = this.cacheTags.get(tag);
    return keys ? Array.from(keys).map(key => this.stripPrefix(key)) : [];
  }

  /**
   * Get tags for key
   */
  getTagsForKey(key: string): string[] {
    const fullKey = this.getFullKey(key);
    const tags = this.keyTags.get(fullKey);
    return tags ? Array.from(tags) : [];
  }

  /**
   * Private helper methods
   */
  private initializeCacheProvider(): ICacheService {
    const cacheConfig = {
      provider: this.config.provider as any,
      ttl: this.config.defaultTtl,
      maxSize: this.config.maxMemorySize,
      keyPrefix: this.config.keyPrefix,
      redisUrl: this.config.redisUrl,
      enableCompression: this.config.enableCompression,
      enableMetrics: this.config.enableMetrics,
      enableSerialization: this.config.enableSerialization
    };

    switch (this.config.provider) {
      case 'redis':
        return CacheProviderFactory.createRedis(cacheConfig);
      case 'hybrid':
        return CacheProviderFactory.createHybrid(cacheConfig);
      case 'memory':
      default:
        return CacheProviderFactory.createMemory(cacheConfig);
    }
  }

  private initializeDefaultInvalidationRules(): void {
    // Product-related invalidation
    this.invalidationRules.push(
      {
        pattern: 'product:*',
        action: 'refresh',
        cascade: true,
        priority: 1
      },
      {
        pattern: 'category:*',
        action: 'refresh',
        cascade: true,
        priority: 1
      },
      {
        pattern: 'search:*',
        action: 'delete',
        cascade: false,
        priority: 2
      }
    );
  }

  private getFullKey(key: unknown): string {
    const normalizedKey = this.normalizeKey(key);
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${normalizedKey}` : normalizedKey;
  }

  private normalizeKey(key: unknown): string {
    if (typeof key === 'string') {
      return key;
    }

    if (typeof key === 'number' || typeof key === 'boolean' || typeof key === 'bigint') {
      return String(key);
    }

    if (key instanceof Date) {
      return key.toISOString();
    }

    if (Array.isArray(key)) {
      return key.map(item => this.normalizeKey(item)).join(':');
    }

    if (key && typeof key === 'object') {
      return Object.entries(key as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `${name}:${this.normalizeKey(value)}`)
        .join('|');
    }

    return String(key);
  }

  private stripPrefix(fullKey: string): string {
    if (!this.config.keyPrefix) return fullKey;
    return fullKey.replace(`${this.config.keyPrefix}:`, '');
  }

  private addTagsToKey(key: string, tags: string[]): void {
    // Add key to each tag's set
    for (const tag of tags) {
      if (!this.cacheTags.has(tag)) {
        this.cacheTags.set(tag, new Set());
      }
      this.cacheTags.get(tag)!.add(key);
    }

    // Add tags to key's set
    if (!this.keyTags.has(key)) {
      this.keyTags.set(key, new Set());
    }
    for (const tag of tags) {
      this.keyTags.get(key)!.add(tag);
    }
  }

  private removeKeyFromTags(key: string): void {
    const tags = this.keyTags.get(key);
    if (tags) {
      for (const tag of tags) {
        const keySet = this.cacheTags.get(tag);
        if (keySet) {
          keySet.delete(key);
          if (keySet.size === 0) {
            this.cacheTags.delete(tag);
          }
        }
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching - convert glob to regex
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(key);
  }

  private async warmCacheByPattern(pattern: string): Promise<void> {
    // Find tasks that might provide data for this pattern
    const relevantTasks = Array.from(this.warmingTasks.values())
      .filter(task => task.name.toLowerCase().includes(pattern.split(':')[0]));

    if (relevantTasks.length > 0) {
      await this.warmCache(relevantTasks.map(t => t.id));
    }
  }

  private updateAnalytics(isHit: boolean, responseTime: number): void {
    this.analytics.totalRequests++;
    this.analytics.totalResponseTime += responseTime;

    if (isHit) {
      this.analytics.cacheHits++;
    } else {
      this.analytics.cacheMisses++;
    }
  }

  private calculateEntrySize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }
}

// Legacy export name retained for compatibility with older tests and callers.
export { DistributedCacheService as CacheService };

/**
 * Cache Service Factory
 */
export class CacheServiceFactory {
  private static instance: DistributedCacheService | null = null;

  static create(config: Partial<CacheServiceConfig> = {}): DistributedCacheService {
    return new DistributedCacheService(config);
  }

  static getInstance(): DistributedCacheService | null {
    return this.instance;
  }

  static setInstance(service: DistributedCacheService): void {
    if (this.instance) {
      throw new Error('Cache service instance already exists');
    }
    this.instance = service;
  }
}

/**
 * Cache Warming Strategies
 */
export class CacheWarmingStrategies {
  /**
   * Product catalog warming strategy
   */
  static createProductWarmingTask(productRepository: any): CacheWarmingTask {
    return {
      id: 'products',
      name: 'Product Catalog Warming',
      priority: 1,
      execute: async () => {
        // In a real implementation, this would fetch products from repository
        const products = [
          { id: '1', name: 'Sample Product 1', category: 'electronics' },
          { id: '2', name: 'Sample Product 2', category: 'books' }
        ];

        return products.map(product => ({
          key: CacheKeyGenerator.product.byId(product.id),
          data: product,
          ttl: 3600 // 1 hour
        }));
      }
    };
  }

  /**
   * Category warming strategy
   */
  static createCategoryWarmingTask(categoryRepository: any): CacheWarmingTask {
    return {
      id: 'categories',
      name: 'Category Warming',
      priority: 2,
      dependencies: ['products'],
      execute: async () => {
        // In a real implementation, this would fetch categories
        const categories = [
          { id: 'electronics', name: 'Electronics', parentId: null },
          { id: 'books', name: 'Books', parentId: null }
        ];

        return categories.map(category => ({
          key: CacheKeyGenerator.category.byId(category.id),
          data: category,
          ttl: 7200 // 2 hours
        }));
      }
    };
  }

  /**
   * Search index warming strategy
   */
  static createSearchWarmingTask(searchService: any): CacheWarmingTask {
    return {
      id: 'search-index',
      name: 'Search Index Warming',
      priority: 3,
      execute: async () => {
        const popularQueries = [
          'laptop', 'phone', 'tablet', 'headphones', 'camera',
          'watch', 'keyboard', 'mouse', 'monitor', 'speaker'
        ];

        const results: Array<{ key: string; data: any; ttl?: number }> = [];

        for (const query of popularQueries) {
          try {
            const searchResults = await searchService.search({ text: query, filters: {} });
            results.push({
              key: CacheKeyGenerator.search.results(query, {}, { page: 1, limit: 20 }),
              data: searchResults,
              ttl: 300
            });
          } catch (error) {
            console.error(`Failed to warm cache for query: ${query}`, error);
          }
        }

        return results;
      }
    };
  }

  /**
   * Facet warming strategy
   */
  static createFacetWarmingTask(searchService: any): CacheWarmingTask {
    return {
      id: 'facets',
      name: 'Facet Warming',
      priority: 4,
      execute: async () => {
        const results: Array<{ key: string; data: any; ttl?: number }> = [];

        try {
          const globalFacets = await searchService.getFacets({});
          results.push({
            key: CacheKeyGenerator.search.facets('', {}),
            data: globalFacets,
            ttl: 1800
          });
        } catch (error) {
          console.error('Failed to warm facet cache', error);
        }

        return results;
      }
    };
  }
}

/**
 * Cache Monitoring and Alerts
 */
export class CacheMonitoring {
  constructor(private cacheService: DistributedCacheService) {}

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    hitRate: number;
    totalSize: number;
    connected: boolean;
    lastWarming?: Date;
  }> {
    const analytics = this.cacheService.getAnalytics();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (analytics.hitRate < 0.5) {
      status = 'degraded';
    }
    if (analytics.hitRate < 0.2 || analytics.totalSize === 0) {
      status = 'unhealthy';
    }

    return {
      status,
      hitRate: analytics.hitRate,
      totalSize: analytics.totalSize,
      connected: true // Would check actual connection in real implementation
    };
  }

  /**
   * Monitor cache performance
   */
  startPerformanceMonitoring(interval: number = 60000): () => void {
    const intervalId = setInterval(async () => {
      const analytics = this.cacheService.getAnalytics();

      // Log performance metrics
      console.log('Cache Performance:', {
        hitRate: `${(analytics.hitRate * 100).toFixed(1)}%`,
        totalRequests: analytics.totalRequests,
        averageResponseTime: `${analytics.averageResponseTime.toFixed(2)}ms`,
        totalSize: `${(analytics.totalSize / 1024 / 1024).toFixed(2)}MB`
      });

      // Alert on poor performance
      if (analytics.hitRate < 0.3) {
        console.warn('Cache hit rate is below 30%');
      }

      if (analytics.averageResponseTime > 100) {
        console.warn('Cache response time is above 100ms');
      }
    }, interval);

    return () => clearInterval(intervalId);
  }
}

/**
 * Cache Migration Utilities
 */
export class CacheMigrationUtils {
  /**
   * Migrate from old cache structure to new
   */
  static async migrateCacheData(
    oldCache: ICacheService,
    newCache: DistributedCacheService,
    keyMapping?: (oldKey: string) => string
  ): Promise<void> {
    // In a real implementation, this would migrate cache data
    console.log('Cache migration not implemented');
  }

  /**
   * Validate cache integrity
   */
  static async validateCacheIntegrity(cache: DistributedCacheService): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    // In a real implementation, this would validate cache data integrity
    return { valid: true, errors: [] };
  }
}
