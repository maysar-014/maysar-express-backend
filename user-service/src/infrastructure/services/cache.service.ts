import { DomainService } from '@domain/interfaces';

/**
 * Cache Service Interface
 */
export interface CacheService extends DomainService {
  set(key: string, value: any, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
  increment(key: string, amount?: number): Promise<number>;
  expire(key: string, ttl: number): Promise<void>;
}

/**
 * In-Memory Cache Service Implementation
 * For development and testing purposes
 */
export class InMemoryCacheService implements CacheService {
  public readonly name = 'InMemoryCacheService';
  private cache: Map<string, { value: any; expiresAt?: number }> = new Map();

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expiresAt } as { value: any; expiresAt?: number });
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current || 0) + amount;
    await this.set(key, newValue);
    return newValue;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      const expiresAt = Date.now() + ttl * 1000;
      this.cache.set(key, { ...item, expiresAt });
    }
  }
}

/**
 * Redis Cache Service Implementation
 * For production use
 */
export class RedisCacheService implements CacheService {
  public readonly name = 'RedisCacheService';
  
  // TODO: Implement Redis integration
  // This would require setting up Redis client and connection
  // For now, we'll use the in-memory implementation as fallback

  private fallbackService: InMemoryCacheService;

  constructor() {
    this.fallbackService = new InMemoryCacheService();
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // TODO: Implement Redis set with TTL
    return this.fallbackService.set(key, value, ttl);
  }

  async get<T>(key: string): Promise<T | null> {
    // TODO: Implement Redis get
    return this.fallbackService.get<T>(key);
  }

  async del(key: string): Promise<void> {
    // TODO: Implement Redis delete
    return this.fallbackService.del(key);
  }

  async exists(key: string): Promise<boolean> {
    // TODO: Implement Redis exists
    return this.fallbackService.exists(key);
  }

  async flush(): Promise<void> {
    // TODO: Implement Redis flush
    return this.fallbackService.flush();
  }

  async increment(key: string, amount?: number): Promise<number> {
    // TODO: Implement Redis increment
    return this.fallbackService.increment(key, amount);
  }

  async expire(key: string, ttl: number): Promise<void> {
    // TODO: Implement Redis expire
    return this.fallbackService.expire(key, ttl);
  }
}