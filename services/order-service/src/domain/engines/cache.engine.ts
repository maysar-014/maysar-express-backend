/**
 * Cache Engine (order-service domain utility)
 * In-memory cache kept inside the domain boundary to avoid outward dependencies.
 */

export interface CacheGetResult<T = any> {
    hit: boolean;
    value: T | null;
}

interface CacheEntry<T = any> {
    value: T;
    expiresAt: number;
}

export class CacheEngine {
    private readonly store = new Map<string, CacheEntry>();

    /**
     * Retrieves a cached entry.
     * Returns `{ hit: true, value }` on cache hit and `{ hit: false, value: null }` on miss.
     */
    async get<T = any>(key: string): Promise<CacheGetResult<T>> {
        const entry = this.store.get(key);
        if (!entry) {
            return { hit: false, value: null };
        }

        if (entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return { hit: false, value: null };
        }

        return { hit: true, value: entry.value as T };
    }

    /**
     * Stores a value with an optional TTL in seconds (default: 300 s).
     */
    async set<T = any>(key: string, value: T, ttlSeconds = 300): Promise<boolean> {
        if (ttlSeconds <= 0) {
            this.store.delete(key);
            return true;
        }

        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });

        return true;
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
        this.store.clear();
    }
}
