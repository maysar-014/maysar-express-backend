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

  async set(_key: string, _value: any, _ttl?: number): Promise<void> {
    throw new Error('RedisCacheService is not configured. Provide a Redis-backed implementation.');
  }

  async get<T>(_key: string): Promise<T | null> {
    throw new Error('RedisCacheService is not configured. Provide a Redis-backed implementation.');
  }

  async del(_key: string): Promise<void> {
    throw new Error('RedisCacheService is not configured. Provide a Redis-backed implementation.');
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error('RedisCacheService is not configured. Provide a Redis-backed implementation.');
  }

  async flush(): Promise<void> {
    throw new Error('RedisCacheService is not configured. Provide a Redis-backed implementation.');
  }

  async increment(_key: string, _amount?: number): Promise<number> {
    throw new Error('RedisCacheService is not configured. Provide a Redis-backed implementation.');
  }

  async expire(_key: string, _ttl: number): Promise<void> {
    throw new Error('RedisCacheService is not configured. Provide a Redis-backed implementation.');
  }
}
