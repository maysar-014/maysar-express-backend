/**
 * Cache service - Redis for preferences, templates, rate limits
 */

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: string | number | object, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
}

export class CacheService implements ICacheService {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  async set(key: string, value: string | number | object, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value: serialized, expiry });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const next = (entry ? parseInt(entry.value, 10) || 0 : 0) + 1;
    this.store.set(key, { value: String(next) });
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiry = Date.now() + ttlSeconds * 1000;
      this.store.set(key, entry);
    }
  }
}
