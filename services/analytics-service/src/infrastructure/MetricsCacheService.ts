export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export class MetricsCacheService {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private defaultTTL = 3600; // 1 hour in seconds

  generateKey(sellerId: string, metric: string, timeWindow: string): string {
    return `seller-metrics:${sellerId}:${metric}:${timeWindow}`;
  }

  set(key: string, value: any, options?: CacheOptions): void {
    const ttl = options?.ttl || this.defaultTTL;
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }

  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await computeFn();
    this.set(key, result, options);
    return result;
  }
}
