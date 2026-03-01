/**
 * Cache Engine (order-service domain adapter)
 * Thin domain-layer wrapper around the infrastructure CacheManager.
 * Exposes a simple get / set / clear API designed for use by domain code and tests.
 */

import { MemoryCache } from '../../infrastructure/cache/cache-manager';

export interface CacheGetResult<T = any> {
    hit: boolean;
    value: T | null;
}

export class CacheEngine {
    private readonly store: MemoryCache;

    constructor() {
        this.store = new MemoryCache();
    }

    /**
     * Retrieves a cached entry.
     * Returns `{ hit: true, value }` on cache hit and `{ hit: false, value: null }` on miss.
     */
    async get<T = any>(key: string): Promise<CacheGetResult<T>> {
        const value = await this.store.get<T>(key);
        if (value === null) {
            return { hit: false, value: null };
        }
        return { hit: true, value };
    }

    /**
     * Stores a value with an optional TTL in seconds (default: 300 s).
     */
    async set<T = any>(key: string, value: T, ttlSeconds = 300): Promise<boolean> {
        return this.store.set(key, value, { ttl: ttlSeconds });
    }

    /**
     * Deletes a single cache entry.
     */
    async delete(key: string): Promise<boolean> {
        return this.store.delete(key);
    }

    /**
     * Clears all cached entries.
     */
    async clear(): Promise<void> {
        return this.store.clear();
    }
}
