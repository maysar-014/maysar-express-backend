export class SellerDashboardCache {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private defaultTTL = 300; // 5 minutes for money snapshot

  generateKey(sellerId: string, section: string): string {
    return `seller-dashboard:${sellerId}:${section}`;
  }

  set(key: string, value: any, ttl?: number): void {
    const duration = ttl || this.defaultTTL;
    const expiresAt = Date.now() + duration * 1000;
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
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await computeFn();
    this.set(key, result, ttl);
    return result;
  }
}
