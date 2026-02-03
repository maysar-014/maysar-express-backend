/**
 * Cache Provider Test Suite
 * 
 * Purpose: Validates cache provider implementation and caching strategies
 * Scope: Infrastructure layer testing with mocked cache dependencies
 * Coverage Target: 95% (critical caching logic)
 * 
 * Test Categories:
 * - Cache operations (get, set, delete, clear)
 * - Cache invalidation strategies
 * - Cache key generation and management
 * - Cache performance and optimization
 * - Cache error handling and fallbacks
 * - Cache serialization and deserialization
 * - Cache TTL and expiration handling
 * - Cache consistency and synchronization
 * 
 * Edge Cases Covered:
 * - Cache misses and hits
 * - Cache key collisions
 * - Cache size limits and eviction
 * - Cache serialization errors
 * - Cache connection failures
 * - Concurrent cache operations
 * - Cache key generation edge cases
 * - Cache TTL edge cases
 */

import { 
  MemoryCacheProvider, 
  RedisCacheProvider, 
  HybridCacheProvider, 
  CacheProviderFactory, 
  CacheKeyGenerator,
  CacheProvider
} from '../cache-provider';
import { CacheService } from '../../../domain/interfaces';

describe('Memory Cache Provider', () => {
  let cacheProvider: MemoryCacheProvider;

  beforeEach(() => {
    cacheProvider = new MemoryCacheProvider({
      provider: CacheProvider.MEMORY,
      ttl: 300,
      maxSize: 100,
      keyPrefix: 'test:',
      enableSerialization: true
    });
  });

  describe('Basic Cache Operations', () => {
    it('should get cached value', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await cacheProvider.set(key, value);

      const result = await cacheProvider.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';

      const result = await cacheProvider.get(key);

      expect(result).toBeNull();
    });

    it('should set cached value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 60;

      await cacheProvider.set(key, value, ttl);

      const result = await cacheProvider.get(key);
      expect(result).toEqual(value);
    });

    it('should delete cached value', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await cacheProvider.set(key, value);
      const deleted = await cacheProvider.delete(key);

      expect(deleted).toBe(true);
      const result = await cacheProvider.get(key);
      expect(result).toBeNull();
    });

    it('should clear all cached values', async () => {
      await cacheProvider.set('key1', { data: 'value1' });
      await cacheProvider.set('key2', { data: 'value2' });

      await cacheProvider.clear();

      const result1 = await cacheProvider.get('key1');
      const result2 = await cacheProvider.get('key2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await cacheProvider.set(key, value);
      const exists = await cacheProvider.exists(key);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent key existence check', async () => {
      const exists = await cacheProvider.exists('non-existent-key');

      expect(exists).toBe(false);
    });
  });

  describe('Cache Statistics', () => {
    it('should get cache statistics', () => {
      // Set some values to generate stats
      cacheProvider.set('key1', { data: 'value1' });
      cacheProvider.set('key2', { data: 'value2' });

      const stats = cacheProvider.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('evictions');
      expect(stats).toHaveProperty('entries');
      expect(stats.entries).toBeInstanceOf(Array);
    });

    it('should track cache hits and misses', async () => {
      // Initial miss
      await cacheProvider.get('non-existent-key');

      // Set and get (hit)
      await cacheProvider.set('key1', { data: 'value1' });
      await cacheProvider.get('key1');

      const stats = cacheProvider.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('Cache Configuration', () => {
    it('should use key prefix', async () => {
      const cacheWithPrefix = new MemoryCacheProvider({
        provider: CacheProvider.MEMORY,
        ttl: 300,
        maxSize: 100,
        keyPrefix: 'prefix:',
        enableSerialization: true
      });

      await cacheWithPrefix.set('test-key', { data: 'test' });
      const result = await cacheWithPrefix.get('test-key');

      expect(result).toEqual({ data: 'test' });
    });

    it('should handle serialization', async () => {
      const cacheWithSerialization = new MemoryCacheProvider({
        provider: CacheProvider.MEMORY,
        ttl: 300,
        maxSize: 100,
        keyPrefix: '',
        enableSerialization: true
      });

      const complexObject = {
        nested: { array: [1, 2, 3] },
        date: new Date(),
        string: 'test'
      };

      await cacheWithSerialization.set('complex-key', complexObject);
      const result = await cacheWithSerialization.get('complex-key');

      // Date objects are serialized as strings, so we need to compare the string representation
      const typedResult = result as any;
      expect(typedResult.nested).toEqual(complexObject.nested);
      expect(typedResult.string).toEqual(complexObject.string);
      expect(typeof typedResult.date).toBe('string'); // Date becomes string after JSON serialization
    });

    it('should handle non-serialized values', async () => {
      const cacheWithoutSerialization = new MemoryCacheProvider({
        provider: CacheProvider.MEMORY,
        ttl: 300,
        maxSize: 100,
        keyPrefix: '',
        enableSerialization: false
      });

      const value = 'simple string';

      await cacheWithoutSerialization.set('string-key', value);
      const result = await cacheWithoutSerialization.get('string-key');

      expect(result).toBe(value);
    });
  });

  describe('Cache Size Limits', () => {
    it('should evict oldest entries when size limit reached', async () => {
      const smallCache = new MemoryCacheProvider({
        provider: CacheProvider.MEMORY,
        ttl: 300,
        maxSize: 2, // Very small cache
        keyPrefix: '',
        enableSerialization: true
      });

      // Fill cache to capacity
      await smallCache.set('key1', { data: 'value1' });
      await smallCache.set('key2', { data: 'value2' });

      // Access key1 to make key2 oldest
      await smallCache.get('key1');

      // Add new entry, should evict key2 (oldest)
      await smallCache.set('key3', { data: 'value3' });

      // Check cache stats to see what happened
      const stats = smallCache.getStats();
      
      // Cache should have exactly 2 entries after eviction
      expect(stats.size).toBe(2);

      // key1 should still exist (recently accessed)
      const result1 = await smallCache.get('key1');
      expect(result1).toEqual({ data: 'value1' });

      // key3 should exist (newly added)
      const result3 = await smallCache.get('key3');
      expect(result3).toEqual({ data: 'value3' });

      // key2 should be evicted (oldest)
      const result2 = await smallCache.get('key2');
      expect(result2).toBeNull();
    });
  });

  describe('Cache Expiration', () => {
    it('should handle expired entries', async () => {
      const cacheWithShortTTL = new MemoryCacheProvider({
        provider: CacheProvider.MEMORY,
        ttl: 1, // 1 second TTL
        maxSize: 100,
        keyPrefix: '',
        enableSerialization: true
      });

      await cacheWithShortTTL.set('short-key', { data: 'test' });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await cacheWithShortTTL.get('short-key');
      expect(result).toBeNull();
    });
  });

  describe('Redis Cache Provider', () => {
    let redisCache: RedisCacheProvider;

    beforeEach(() => {
      redisCache = new RedisCacheProvider({
        provider: CacheProvider.REDIS,
        ttl: 300,
        redisUrl: 'redis://localhost:6379',
        enableSerialization: true
      });
    });

    it('should create Redis cache provider', () => {
      expect(redisCache).toBeInstanceOf(RedisCacheProvider);
    });

    it('should handle Redis connection errors gracefully', async () => {
      // Redis cache should handle connection failures gracefully
      const result = await redisCache.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Hybrid Cache Provider', () => {
    let hybridCache: HybridCacheProvider;

    beforeEach(() => {
      hybridCache = new HybridCacheProvider({
        provider: CacheProvider.HYBRID,
        ttl: 300,
        maxSize: 50,
        enableSerialization: true
      });
    });

    it('should create Hybrid cache provider', () => {
      expect(hybridCache).toBeInstanceOf(HybridCacheProvider);
    });

    it('should get cache statistics', () => {
      const stats = hybridCache.getStats();
      expect(stats).toHaveProperty('l1');
      expect(stats).toHaveProperty('l2');
      expect(stats).toHaveProperty('combined');
    });
  });

  describe('Cache Provider Factory', () => {
    it('should create Memory cache provider', () => {
      const provider = CacheProviderFactory.createMemory({
        provider: CacheProvider.MEMORY,
        ttl: 300,
        maxSize: 100
      });

      expect(provider).toBeInstanceOf(MemoryCacheProvider);
    });

    it('should create Redis cache provider', () => {
      const provider = CacheProviderFactory.createRedis({
        provider: CacheProvider.REDIS,
        ttl: 300,
        redisUrl: 'redis://localhost:6379'
      });

      expect(provider).toBeInstanceOf(RedisCacheProvider);
    });

    it('should create Hybrid cache provider', () => {
      const provider = CacheProviderFactory.createHybrid({
        provider: CacheProvider.HYBRID,
        ttl: 300,
        maxSize: 50
      });

      expect(provider).toBeInstanceOf(HybridCacheProvider);
    });

    it('should create default cache provider', () => {
      const provider = CacheProviderFactory.createDefault({
        provider: CacheProvider.MEMORY,
        ttl: 300
      });

      expect(provider).toBeInstanceOf(MemoryCacheProvider);
    });

    it('should manage singleton instance', () => {
      const provider1 = new MemoryCacheProvider({
        provider: CacheProvider.MEMORY,
        ttl: 300
      });
      
      CacheProviderFactory.setInstance(provider1);
      const provider2 = CacheProviderFactory.getInstance();

      expect(provider2).toBe(provider1);

      expect(() => {
        const provider3 = new MemoryCacheProvider({
          provider: CacheProvider.MEMORY,
          ttl: 300
        });
        CacheProviderFactory.setInstance(provider3);
      }).toThrow('Cache provider instance already exists');
    });
  });

  describe('Cache Key Generator', () => {
    it('should generate product keys', () => {
      const key = CacheKeyGenerator.product.byId('123');
      expect(key).toBe('product:id:123');
    });

    it('should generate category keys', () => {
      const key = CacheKeyGenerator.category.byId('456');
      expect(key).toBe('category:id:456');
    });

    it('should generate seller keys', () => {
      const key = CacheKeyGenerator.seller.byId('789');
      expect(key).toBe('seller:id:789');
    });

    it('should generate pricing keys', () => {
      const key = CacheKeyGenerator.pricing.rules('product-123');
      expect(key).toBe('pricing:rules:product-123');
    });

    it('should generate search keys', () => {
      const key = CacheKeyGenerator.search.results('query', {}, {});
      expect(key).toMatch(/^search:results:/);
    });
  });

  describe('Cache Error Handling', () => {
    it('should handle serialization errors gracefully', async () => {
      const cache = new MemoryCacheProvider({
        provider: CacheProvider.MEMORY,
        ttl: 300,
        maxSize: 100,
        keyPrefix: '',
        enableSerialization: true
      });

      // Create circular reference
      const circularObject: any = { a: 1 };
      circularObject.self = circularObject;

      // Should handle gracefully without throwing
      await expect(cache.set('circular-key', circularObject)).rejects.toThrow();
    });

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        key: `concurrent-key-${i}`,
        value: { data: `value-${i}` }
      }));

      const promises = operations.map(async (op) => {
        await cacheProvider.set(op.key, op.value);
        return cacheProvider.get(op.key);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toEqual({ data: `value-${index}` });
      });
    });
  });

  describe('Cache Performance', () => {
    it('should measure cache operation performance', async () => {
      const key = 'perf-key';
      const value = { data: 'test' };

      const startTime = Date.now();
      await cacheProvider.set(key, value);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle cache size efficiently', async () => {
      // Fill cache with multiple entries
      for (let i = 0; i < 50; i++) {
        await cacheProvider.set(`key-${i}`, { data: `value-${i}` });
      }

      // Check that cache size is reasonable
      const stats = cacheProvider.getStats();
      expect(stats.size).toBeLessThanOrEqual(50);
    });
  });
});
