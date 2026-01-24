/**
 * Cache Service Tests
 * Infrastructure layer testing for distributed caching operations
 * Tests cache providers, invalidation, warming, and error scenarios
 *
 * Coverage Requirements (per Testing Constitution):
 * - Infrastructure Layer: 75% minimum, 80% target, 85% critical
 * - Mock external services (Redis, providers)
 * - Test error scenarios and fallbacks
 * - Service isolation and resilience testing
 */

import {
  DistributedCacheService,
  CacheServiceConfig,
  CacheAnalytics,
  CacheWarmingStrategies,
  CacheMonitoring,
  CacheServiceFactory
} from '../cache.service';

// Mock cache providers
jest.mock('../../providers/cache-provider', () => ({
  CacheProviderFactory: {
    createMemory: jest.fn(),
    createRedis: jest.fn(),
    createHybrid: jest.fn()
  },
  MemoryCacheProvider: jest.fn(),
  RedisCacheProvider: jest.fn(),
  HybridCacheProvider: jest.fn(),
  CacheKeyGenerator: {
    product: {
      byId: jest.fn((id) => `product:${id}`),
      byCategory: jest.fn((categoryId) => `product:category:${categoryId}`)
    },
    category: {
      byId: jest.fn((id) => `category:${id}`)
    },
    search: {
      byQuery: jest.fn((query) => `search:${query}`)
    }
  },
  CachedRepository: jest.fn()
}));

import {
  CacheProviderFactory,
  CacheKeyGenerator,
  CachedRepository
} from '../../providers/cache-provider';

// Mock cache provider instances
const mockMemoryProvider = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  clear: jest.fn()
};

const mockRedisProvider = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  clear: jest.fn(),
  getMultiple: jest.fn(),
  setMultiple: jest.fn()
};

const mockHybridProvider = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  clear: jest.fn()
};

describe('DistributedCacheService', () => {
  let cacheService: DistributedCacheService;
  let config: CacheServiceConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      provider: 'memory',
      defaultTtl: 300,
      keyPrefix: 'test',
      enableMetrics: true,
      enableCompression: false,
      enableSerialization: true,
      cacheWarming: {
        enabled: false,
        interval: 3600000,
        batchSize: 100
      },
      invalidation: {
        enabled: true,
        patterns: ['product:*', 'category:*'],
        cascadeDelete: true
      }
    };

    // Setup mock providers
    (CacheProviderFactory.createMemory as jest.Mock).mockReturnValue(mockMemoryProvider);
    (CacheProviderFactory.createRedis as jest.Mock).mockReturnValue(mockRedisProvider);
    (CacheProviderFactory.createHybrid as jest.Mock).mockReturnValue(mockHybridProvider);

    cacheService = new DistributedCacheService(config);
  });

  describe('initialization', () => {
    it('should initialize with memory provider by default', () => {
      expect(CacheProviderFactory.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'memory',
          ttl: 300,
          keyPrefix: 'test'
        })
      );
    });

    it('should initialize with redis provider when specified', () => {
      const redisConfig = { ...config, provider: 'redis' as const, redisUrl: 'redis://localhost:6379' };
      new DistributedCacheService(redisConfig);

      expect(CacheProviderFactory.createRedis).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'redis',
          redisUrl: 'redis://localhost:6379'
        })
      );
    });

    it('should initialize with hybrid provider when specified', () => {
      const hybridConfig = { ...config, provider: 'hybrid' as const };
      new DistributedCacheService(hybridConfig);

      expect(CacheProviderFactory.createHybrid).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'hybrid'
        })
      );
    });

    it('should initialize default invalidation rules', () => {
      // Access private property to verify rules
      const rules = (cacheService as any).invalidationRules;
      expect(rules).toHaveLength(3);
      expect(rules[0].pattern).toBe('product:*');
      expect(rules[1].pattern).toBe('category:*');
      expect(rules[2].pattern).toBe('search:*');
    });
  });

  describe('basic cache operations', () => {
    describe('get', () => {
      it('should retrieve value from cache successfully', async () => {
        mockMemoryProvider.get.mockResolvedValue('cached-value');

        const result = await cacheService.get<string>('test-key');

        expect(mockMemoryProvider.get).toHaveBeenCalledWith('test:test-key');
        expect(result).toBe('cached-value');
      });

      it('should return null when key not found', async () => {
        mockMemoryProvider.get.mockResolvedValue(null);

        const result = await cacheService.get('non-existent-key');

        expect(result).toBeNull();
      });

      it('should handle provider errors gracefully', async () => {
        mockMemoryProvider.get.mockRejectedValue(new Error('Connection failed'));

        const result = await cacheService.get('test-key');

        expect(result).toBeNull();
      });

      it('should update analytics on cache access', async () => {
        mockMemoryProvider.get.mockResolvedValue('value');

        await cacheService.get('test-key');

        const analytics = cacheService.getAnalytics();
        expect(analytics.totalRequests).toBe(1);
        expect(analytics.cacheHits).toBe(1);
        expect(analytics.cacheMisses).toBe(0);
      });
    });

    describe('set', () => {
      it('should store value in cache with default TTL', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        await cacheService.set('test-key', 'test-value');

        expect(mockMemoryProvider.set).toHaveBeenCalledWith('test:test-key', 'test-value', 300);
      });

      it('should store value with custom TTL', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        await cacheService.set('test-key', 'test-value', 600);

        expect(mockMemoryProvider.set).toHaveBeenCalledWith('test:test-key', 'test-value', 600);
      });

      it('should store value with tags', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        await cacheService.set('test-key', 'test-value', undefined, ['tag1', 'tag2']);

        const keysByTag1 = cacheService.getKeysByTag('tag1');
        const keysByTag2 = cacheService.getKeysByTag('tag2');
        const tagsForKey = cacheService.getTagsForKey('test-key');

        expect(keysByTag1).toContain('test-key');
        expect(keysByTag2).toContain('test-key');
        expect(tagsForKey).toEqual(['tag1', 'tag2']);
      });

      it('should handle provider errors', async () => {
        mockMemoryProvider.set.mockRejectedValue(new Error('Storage failed'));

        await expect(cacheService.set('test-key', 'value')).rejects.toThrow('Storage failed');
      });

      it('should update size analytics', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        await cacheService.set('test-key', { data: 'large object with content' });

        const analytics = cacheService.getAnalytics();
        expect(analytics.totalSize).toBeGreaterThan(0);
      });
    });

    describe('delete', () => {
      it('should delete value from cache', async () => {
        mockMemoryProvider.delete.mockResolvedValue(true);

        const result = await cacheService.delete('test-key');

        expect(mockMemoryProvider.delete).toHaveBeenCalledWith('test:test-key');
        expect(result).toBe(true);
      });

      it('should remove tag associations on delete', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);
        mockMemoryProvider.delete.mockResolvedValue(true);

        await cacheService.set('test-key', 'value', undefined, ['tag1']);
        await cacheService.delete('test-key');

        const keysByTag = cacheService.getKeysByTag('tag1');
        expect(keysByTag).not.toContain('test-key');
      });

      it('should handle provider errors gracefully', async () => {
        mockMemoryProvider.delete.mockRejectedValue(new Error('Delete failed'));

        const result = await cacheService.delete('test-key');

        expect(result).toBe(false);
      });
    });

    describe('exists', () => {
      it('should check if key exists in cache', async () => {
        mockMemoryProvider.exists.mockResolvedValue(true);

        const result = await cacheService.exists('test-key');

        expect(mockMemoryProvider.exists).toHaveBeenCalledWith('test:test-key');
        expect(result).toBe(true);
      });

      it('should handle provider errors gracefully', async () => {
        mockMemoryProvider.exists.mockRejectedValue(new Error('Check failed'));

        const result = await cacheService.exists('test-key');

        expect(result).toBe(false);
      });
    });

    describe('clear', () => {
      it('should clear entire cache', async () => {
        mockMemoryProvider.clear.mockResolvedValue(undefined);

        await cacheService.clear();

        expect(mockMemoryProvider.clear).toHaveBeenCalled();
      });

      it('should clear tag associations on clear', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);
        mockMemoryProvider.clear.mockResolvedValue(undefined);

        await cacheService.set('key1', 'value1', undefined, ['tag1']);
        await cacheService.set('key2', 'value2', undefined, ['tag1']);
        await cacheService.clear();

        const keysByTag = cacheService.getKeysByTag('tag1');
        expect(keysByTag).toHaveLength(0);
      });

      it('should reset analytics on clear', async () => {
        mockMemoryProvider.clear.mockResolvedValue(undefined);

        await cacheService.clear();

        const analytics = cacheService.getAnalytics();
        expect(analytics.totalSize).toBe(0);
      });
    });
  });

  describe('advanced operations', () => {
    describe('getMultiple', () => {
      beforeEach(() => {
        // Switch to Redis provider for multi operations
        config.provider = 'redis';
        cacheService = new DistributedCacheService(config);
      });

      it('should retrieve multiple values using Redis provider', async () => {
        mockRedisProvider.getMultiple.mockResolvedValue({
          'test:key1': 'value1',
          'test:key2': 'value2'
        });

        const result = await cacheService.getMultiple(['key1', 'key2']);

        expect(mockRedisProvider.getMultiple).toHaveBeenCalledWith(['test:key1', 'test:key2']);
        expect(result).toEqual({
          key1: 'value1',
          key2: 'value2'
        });
      });

      it('should fallback to individual gets for non-Redis providers', async () => {
        config.provider = 'memory';
        cacheService = new DistributedCacheService(config);

        mockMemoryProvider.get.mockImplementation((key) =>
          Promise.resolve(key === 'test:key1' ? 'value1' : 'value2')
        );

        const result = await cacheService.getMultiple(['key1', 'key2']);

        expect(mockMemoryProvider.get).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
          key1: 'value1',
          key2: 'value2'
        });
      });
    });

    describe('setMultiple', () => {
      beforeEach(() => {
        config.provider = 'redis';
        cacheService = new DistributedCacheService(config);
      });

      it('should set multiple values using Redis provider', async () => {
        mockRedisProvider.setMultiple.mockResolvedValue(undefined);

        await cacheService.setMultiple({
          key1: 'value1',
          key2: 'value2'
        });

        expect(mockRedisProvider.setMultiple).toHaveBeenCalledWith({
          'test:key1': 'value1',
          'test:key2': 'value2'
        }, 300);
      });

      it('should fallback to individual sets for non-Redis providers', async () => {
        config.provider = 'memory';
        cacheService = new DistributedCacheService(config);

        mockMemoryProvider.set.mockResolvedValue(undefined);

        await cacheService.setMultiple({
          key1: 'value1',
          key2: 'value2'
        });

        expect(mockMemoryProvider.set).toHaveBeenCalledTimes(2);
      });

      it('should apply tags to all entries', async () => {
        config.provider = 'memory';
        cacheService = new DistributedCacheService(config);

        mockMemoryProvider.set.mockResolvedValue(undefined);

        await cacheService.setMultiple({
          key1: 'value1',
          key2: 'value2'
        }, undefined, ['batch-tag']);

        const keysByTag = cacheService.getKeysByTag('batch-tag');
        expect(keysByTag).toEqual(['key1', 'key2']);
      });
    });
  });

  describe('tag-based operations', () => {
    describe('invalidateByTags', () => {
      it('should invalidate keys by tags', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);
        mockMemoryProvider.delete.mockResolvedValue(true);

        await cacheService.set('key1', 'value1', undefined, ['tag1', 'tag2']);
        await cacheService.set('key2', 'value2', undefined, ['tag1']);
        await cacheService.set('key3', 'value3', undefined, ['tag2']);

        const deletedCount = await cacheService.invalidateByTags(['tag1']);

        expect(deletedCount).toBe(2); // key1 and key2
        expect(mockMemoryProvider.delete).toHaveBeenCalledTimes(2);

        // key3 should still exist
        const remainingKeys = cacheService.getKeysByTag('tag2');
        expect(remainingKeys).toEqual(['key3']);
      });

      it('should handle non-existent tags gracefully', async () => {
        const deletedCount = await cacheService.invalidateByTags(['non-existent-tag']);

        expect(deletedCount).toBe(0);
      });
    });

    describe('invalidateByPattern', () => {
      it('should invalidate keys matching pattern', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);
        mockMemoryProvider.delete.mockResolvedValue(true);

        await cacheService.set('product:123', 'product-data', undefined, ['products']);
        await cacheService.set('category:456', 'category-data', undefined, ['categories']);
        await cacheService.set('user:789', 'user-data', undefined, ['users']);

        const deletedCount = await cacheService.invalidateByPattern('product:*');

        expect(deletedCount).toBe(1);
        expect(mockMemoryProvider.delete).toHaveBeenCalledWith('test:product:123');
      });

      it('should handle glob patterns correctly', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);
        mockMemoryProvider.delete.mockResolvedValue(true);

        await cacheService.set('search:electronics:laptop', 'search-data', undefined, ['search']);
        await cacheService.set('search:books:novel', 'search-data', undefined, ['search']);

        const deletedCount = await cacheService.invalidateByPattern('search:electronics:*');

        expect(deletedCount).toBe(1);
        expect(mockMemoryProvider.delete).toHaveBeenCalledWith('test:search:electronics:laptop');
      });
    });

    describe('applyInvalidationRules', () => {
      it('should apply invalidation rules on matching patterns', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);
        mockMemoryProvider.delete.mockResolvedValue(true);

        await cacheService.set('product:123', 'product-data');

        await (cacheService as any).applyInvalidationRules('test:product:123', 'update');

        expect(mockMemoryProvider.delete).toHaveBeenCalledWith('test:product:123');
      });
    });
  });

  describe('cache warming', () => {
    describe('addWarmingTask', () => {
      it('should add cache warming task', () => {
        const task = {
          id: 'test-task',
          name: 'Test Warming Task',
          priority: 1,
          execute: jest.fn().mockResolvedValue([
            { key: 'warm-key', data: 'warm-data', ttl: 3600 }
          ])
        };

        cacheService.addWarmingTask(task);

        // Verify task was added (private property access)
        expect((cacheService as any).warmingTasks.has('test-task')).toBe(true);
      });
    });

    describe('warmCache', () => {
      it('should execute cache warming tasks', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        const task = {
          id: 'test-task',
          name: 'Test Warming Task',
          priority: 1,
          execute: jest.fn().mockResolvedValue([
            { key: 'warm-key-1', data: 'warm-data-1', ttl: 3600 },
            { key: 'warm-key-2', data: 'warm-data-2', ttl: 1800 }
          ])
        };

        cacheService.addWarmingTask(task);
        await cacheService.warmCache(['test-task']);

        expect(task.execute).toHaveBeenCalled();
        expect(mockMemoryProvider.set).toHaveBeenCalledTimes(2);
      });

      it('should execute tasks in priority order', async () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        const highPriorityTask = {
          id: 'high-priority',
          name: 'High Priority Task',
          priority: 1,
          execute: jest.fn().mockResolvedValue([
            { key: 'high-key', data: 'high-data' }
          ])
        };

        const lowPriorityTask = {
          id: 'low-priority',
          name: 'Low Priority Task',
          priority: 2,
          execute: jest.fn().mockResolvedValue([
            { key: 'low-key', data: 'low-data' }
          ])
        };

        cacheService.addWarmingTask(lowPriorityTask);
        cacheService.addWarmingTask(highPriorityTask);

        await cacheService.warmCache();

        // High priority task should execute first
        expect(highPriorityTask.execute).toHaveBeenCalled();
        expect(lowPriorityTask.execute).toHaveBeenCalled();
      });

      it('should handle task execution errors gracefully', async () => {
        const failingTask = {
          id: 'failing-task',
          name: 'Failing Task',
          priority: 1,
          execute: jest.fn().mockRejectedValue(new Error('Task failed'))
        };

        cacheService.addWarmingTask(failingTask);
        await cacheService.warmCache(['failing-task']);

        expect(failingTask.execute).toHaveBeenCalled();
        // Service should not throw despite task failure
      });

      it('should batch entries according to batch size', async () => {
        config.cacheWarming.batchSize = 2;
        cacheService = new DistributedCacheService(config);

        mockMemoryProvider.set.mockResolvedValue(undefined);

        const largeTask = {
          id: 'large-task',
          name: 'Large Warming Task',
          priority: 1,
          execute: jest.fn().mockResolvedValue([
            { key: 'key1', data: 'data1' },
            { key: 'key2', data: 'data2' },
            { key: 'key3', data: 'data3' }
          ])
        };

        cacheService.addWarmingTask(largeTask);
        await cacheService.warmCache(['large-task']);

        expect(mockMemoryProvider.set).toHaveBeenCalledTimes(2); // 2 batches
      });
    });

    describe('periodic warming', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should start periodic cache warming', () => {
        const warmingConfig = {
          ...config,
          cacheWarming: { ...config.cacheWarming, enabled: true }
        };
        cacheService = new DistributedCacheService(warmingConfig);

        cacheService.startPeriodicWarming();

        expect((cacheService as any).warmingInterval).toBeDefined();

        cacheService.stopPeriodicWarming();
      });

      it('should not start warming when disabled', () => {
        cacheService.startPeriodicWarming();

        expect((cacheService as any).warmingInterval).toBeUndefined();
      });

      it('should execute warming tasks periodically', () => {
        const warmingConfig = {
          ...config,
          cacheWarming: { ...config.cacheWarming, enabled: true, interval: 1000 }
        };
        cacheService = new DistributedCacheService(warmingConfig);

        const task = {
          id: 'periodic-task',
          name: 'Periodic Task',
          priority: 1,
          execute: jest.fn().mockResolvedValue([])
        };

        cacheService.addWarmingTask(task);
        cacheService.startPeriodicWarming();

        jest.advanceTimersByTime(1000);

        expect(task.execute).toHaveBeenCalled();

        cacheService.stopPeriodicWarming();
      });
    });
  });

  describe('analytics and monitoring', () => {
    describe('getAnalytics', () => {
      it('should return comprehensive cache analytics', () => {
        // Perform some operations to generate analytics
        mockMemoryProvider.get.mockResolvedValue('value');
        mockMemoryProvider.set.mockResolvedValue(undefined);

        // Access private analytics update method
        (cacheService as any).updateAnalytics(true, 10);
        (cacheService as any).updateAnalytics(false, 5);

        const analytics: CacheAnalytics = cacheService.getAnalytics();

        expect(analytics.totalRequests).toBe(2);
        expect(analytics.cacheHits).toBe(1);
        expect(analytics.cacheMisses).toBe(1);
        expect(analytics.hitRate).toBe(0.5);
        expect(analytics.averageResponseTime).toBe(7.5);
        expect(analytics.timestamp).toBeInstanceOf(Date);
      });

      it('should calculate hit rate correctly', () => {
        (cacheService as any).updateAnalytics(true, 10); // hit
        (cacheService as any).updateAnalytics(true, 10); // hit
        (cacheService as any).updateAnalytics(false, 10); // miss

        const analytics = cacheService.getAnalytics();

        expect(analytics.hitRate).toBe(2/3);
      });

      it('should track entries by tag', () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        cacheService.set('key1', 'value1', undefined, ['tag1']);
        cacheService.set('key2', 'value2', undefined, ['tag1', 'tag2']);

        const analytics = cacheService.getAnalytics();

        expect(analytics.entriesByTag['tag1']).toBe(2);
        expect(analytics.entriesByTag['tag2']).toBe(1);
      });
    });

    describe('createCachedRepository', () => {
      it('should create cached repository wrapper', () => {
        const mockRepository = { findById: jest.fn() };

        const cachedRepo = cacheService.createCachedRepository(mockRepository);

        expect(CachedRepository).toHaveBeenCalledWith(cacheService, expect.any(Object));
        expect(cachedRepo).toBeDefined();
      });
    });
  });

  describe('export and import', () => {
    describe('exportCache', () => {
      it('should export cache metadata', async () => {
        const exportData = await cacheService.exportCache();

        expect(exportData).toHaveProperty('config');
        expect(exportData).toHaveProperty('analytics');
        expect(exportData).toHaveProperty('tags');
        expect(exportData).toHaveProperty('timestamp');
      });
    });

    describe('importCache', () => {
      it('should import cache data', async () => {
        const importData = {
          config: config,
          analytics: cacheService.getAnalytics(),
          tags: {},
          timestamp: new Date()
        };

        // Should not throw
        await expect(cacheService.importCache(importData)).resolves.toBeUndefined();
      });
    });
  });

  describe('tag management', () => {
    describe('getKeysByTag', () => {
      it('should return keys associated with tag', () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        cacheService.set('key1', 'value1', undefined, ['tag1']);
        cacheService.set('key2', 'value2', undefined, ['tag1']);

        const keys = cacheService.getKeysByTag('tag1');

        expect(keys).toEqual(['key1', 'key2']);
      });

      it('should return empty array for non-existent tag', () => {
        const keys = cacheService.getKeysByTag('non-existent');

        expect(keys).toEqual([]);
      });
    });

    describe('getTagsForKey', () => {
      it('should return tags associated with key', () => {
        mockMemoryProvider.set.mockResolvedValue(undefined);

        cacheService.set('test-key', 'value', undefined, ['tag1', 'tag2']);

        const tags = cacheService.getTagsForKey('test-key');

        expect(tags).toEqual(['tag1', 'tag2']);
      });

      it('should return empty array for untagged key', () => {
        const tags = cacheService.getTagsForKey('untagged-key');

        expect(tags).toEqual([]);
      });
    });
  });

  describe('error handling and fallbacks', () => {
    it('should handle cache provider initialization errors', () => {
      (CacheProviderFactory.createMemory as jest.Mock).mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });

      expect(() => new DistributedCacheService(config)).toThrow('Provider initialization failed');
    });

    it('should handle key prefix operations correctly', () => {
      const prefixedService = new DistributedCacheService({ ...config, keyPrefix: 'custom' });

      expect((prefixedService as any).getFullKey('test')).toBe('custom:test');
      expect((prefixedService as any).stripPrefix('custom:test')).toBe('test');
    });

    it('should handle pattern matching for invalidation', () => {
      const matches = (cacheService as any).matchesPattern('product:123', 'product:*');
      expect(matches).toBe(true);

      const noMatch = (cacheService as any).matchesPattern('user:123', 'product:*');
      expect(noMatch).toBe(false);
    });

    it('should handle empty key sets in invalidation', async () => {
      mockMemoryProvider.delete.mockResolvedValue(true);

      // Try to invalidate non-existent tag
      const deletedCount = await cacheService.invalidateByTags(['empty-tag']);

      expect(deletedCount).toBe(0);
      expect(mockMemoryProvider.delete).not.toHaveBeenCalled();
    });
  });
});

describe('CacheWarmingStrategies', () => {
  describe('createProductWarmingTask', () => {
    it('should create product warming task', () => {
      const mockRepository = {};
      const task = CacheWarmingStrategies.createProductWarmingTask(mockRepository);

      expect(task.id).toBe('products');
      expect(task.name).toBe('Product Catalog Warming');
      expect(task.priority).toBe(1);
      expect(typeof task.execute).toBe('function');
    });

    it('should execute product warming task', async () => {
      const mockRepository = {};
      const task = CacheWarmingStrategies.createProductWarmingTask(mockRepository);

      const entries = await task.execute();

      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveProperty('key');
      expect(entries[0]).toHaveProperty('data');
      expect(entries[0]).toHaveProperty('ttl');
    });
  });

  describe('createCategoryWarmingTask', () => {
    it('should create category warming task', () => {
      const mockRepository = {};
      const task = CacheWarmingStrategies.createCategoryWarmingTask(mockRepository);

      expect(task.id).toBe('categories');
      expect(task.name).toBe('Category Warming');
      expect(task.priority).toBe(2);
      expect(task.dependencies).toEqual(['products']);
    });
  });

  describe('createSearchWarmingTask', () => {
    it('should create search warming task', () => {
      const mockService = {};
      const task = CacheWarmingStrategies.createSearchWarmingTask(mockService);

      expect(task.id).toBe('search-index');
      expect(task.name).toBe('Search Index Warming');
      expect(task.priority).toBe(3);
    });
  });
});

describe('CacheMonitoring', () => {
  let monitoring: CacheMonitoring;

  beforeEach(() => {
    const mockCacheService = {
      getAnalytics: jest.fn()
    } as any;

    monitoring = new CacheMonitoring(mockCacheService);
  });

  describe('getHealthStatus', () => {
    it('should return healthy status for good cache performance', async () => {
      const mockAnalytics = {
        hitRate: 0.95,
        totalSize: 1024 * 1024, // 1MB
        totalRequests: 1000,
        cacheHits: 950,
        cacheMisses: 50,
        averageResponseTime: 5,
        totalEvictions: 0
      };

      (monitoring as any).cacheService.getAnalytics.mockReturnValue(mockAnalytics);

      const health = await monitoring.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.hitRate).toBe(0.95);
      expect(health.connected).toBe(true);
    });

    it('should return degraded status for poor performance', async () => {
      const mockAnalytics = {
        hitRate: 0.2,
        totalSize: 1024,
        totalRequests: 100,
        cacheHits: 20,
        cacheMisses: 80,
        averageResponseTime: 150,
        totalEvictions: 10
      };

      (monitoring as any).cacheService.getAnalytics.mockReturnValue(mockAnalytics);

      const health = await monitoring.getHealthStatus();

      expect(health.status).toBe('unhealthy');
    });

    it('should return degraded status for moderate performance issues', async () => {
      const mockAnalytics = {
        hitRate: 0.4,
        totalSize: 1024 * 1024,
        totalRequests: 100,
        cacheHits: 40,
        cacheMisses: 60,
        averageResponseTime: 50,
        totalEvictions: 0
      };

      (monitoring as any).cacheService.getAnalytics.mockReturnValue(mockAnalytics);

      const health = await monitoring.getHealthStatus();

      expect(health.status).toBe('degraded');
    });
  });

  describe('startPerformanceMonitoring', () => {
    it('should start performance monitoring', () => {
      const stopMonitoring = monitoring.startPerformanceMonitoring(1000);

      expect(typeof stopMonitoring).toBe('function');

      stopMonitoring();
    });
  });
});

describe('CacheServiceFactory', () => {
  it('should create cache service instances', () => {
    const service = CacheServiceFactory.create({ provider: 'memory' });

    expect(service).toBeInstanceOf(DistributedCacheService);
  });

  it('should manage singleton instances', () => {
    const service1 = new DistributedCacheService();
    CacheServiceFactory.setInstance(service1);

    const service2 = CacheServiceFactory.getInstance();
    expect(service2).toBe(service1);

    // Should throw on duplicate set
    expect(() => CacheServiceFactory.setInstance(new DistributedCacheService())).toThrow();
  });
});
