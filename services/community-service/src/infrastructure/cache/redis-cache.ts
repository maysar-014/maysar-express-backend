import { logger } from '@modules/auth-service/src/infrastructure/services/logger.service';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis-based cache implementation
 * Provides high-performance caching for frequently accessed data
 */
export class RedisCache {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(
    private redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
    private defaultTtl: number = 3600 // 1 hour default TTL
  ) {
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Connected to Redis');
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  /**
   * Check if Redis is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.client.mGet(keys);
    } catch (error) {
      logger.error(`Redis MGET error for keys ${keys}:`, error);
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * Set value in cache with default TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const expireTime = ttl || this.defaultTtl;
      await this.client.setEx(key, expireTime, value);
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(keyValuePairs: Array<{ key: string; value: string; ttl?: number }>): Promise<void> {
    try {
      const pipeline = this.client.multi();

      for (const { key, value, ttl } of keyValuePairs) {
        const expireTime = ttl || this.defaultTtl;
        pipeline.setEx(key, expireTime, value);
      }

      await pipeline.exec();
    } catch (error) {
      logger.error('Redis MSET error:', error);
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async mdelete(keys: string[]): Promise<number> {
    try {
      return await this.client.del(keys);
    } catch (error) {
      logger.error(`Redis DEL error for keys ${keys}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement numeric value
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.decrBy(key, amount);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear all keys in current database
   */
  async clear(): Promise<void> {
    try {
      await this.client.flushDb();
    } catch (error) {
      logger.error('Redis FLUSHDB error:', error);
      throw error;
    }
  }

  // Specialized caching methods for Community Service

  /**
   * Cache user feed
   */
  async cacheUserFeed(userId: string, feedData: unknown, ttl: number = 300): Promise<void> {
    const key = `feed:user:${userId}`;
    await this.set(key, JSON.stringify(feedData), ttl);
  }

  /**
   * Get cached user feed
   */
  async getCachedUserFeed(userId: string): Promise<unknown> {
    const key = `feed:user:${userId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache post data
   */
  async cachePost(postId: string, postData: unknown, ttl: number = 3600): Promise<void> {
    const key = `post:${postId}`;
    await this.set(key, JSON.stringify(postData), ttl);
  }

  /**
   * Get cached post data
   */
  async getCachedPost(postId: string): Promise<unknown> {
    const key = `post:${postId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache trending topics
   */
  async cacheTrendingTopics(topics: unknown[], ttl: number = 600): Promise<void> {
    const key = 'trending:topics';
    await this.set(key, JSON.stringify(topics), ttl);
  }

  /**
   * Get cached trending topics
   */
  async getCachedTrendingTopics(): Promise<unknown[] | null> {
    const key = 'trending:topics';
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache user engagement counts
   */
  async cacheUserEngagement(userId: string, counts: { likes: number; comments: number; shares: number }, ttl: number = 300): Promise<void> {
    const key = `engagement:user:${userId}`;
    await this.set(key, JSON.stringify(counts), ttl);
  }

  /**
   * Get cached user engagement counts
   */
  async getCachedUserEngagement(userId: string): Promise<{ likes: number; comments: number; shares: number } | null> {
    const key = `engagement:user:${userId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const keys = [
      `feed:user:${userId}`,
      `engagement:user:${userId}`
    ];

    await this.mdelete(keys);
  }

  /**
   * Invalidate post-related cache
   */
  async invalidatePostCache(postId: string): Promise<void> {
    const key = `post:${postId}`;
    await this.delete(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query: string, results: unknown[], ttl: number = 1800): Promise<void> {
    const key = `search:${this.hashQuery(query)}`;
    await this.set(key, JSON.stringify(results), ttl);
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query: string): Promise<unknown[] | null> {
    const key = `search:${this.hashQuery(query)}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Simple hash function for search query caching
   */
  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }
}
