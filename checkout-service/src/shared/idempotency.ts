/**
 * Idempotency Manager
 * Ensures idempotent request processing with TTL-based expiration
 */

interface StoredResult {
  result: any;
  timestamp: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IdempotencyManager {
  private storeMap: Map<string, StoredResult> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  public store(key: string, result: any): void {
    this.storeMap.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  retrieve(key: string): any | null {
    const stored = this.storeMap.get(key);
    if (!stored) return null;

    const age = Date.now() - stored.timestamp;
    if (age > this.ttlMs) {
      this.storeMap.delete(key);
      return null;
    }

    return stored.result;
  }

  exists(key: string): boolean {
    return this.retrieve(key) !== null;
  }

  clear(key: string): void {
    this.storeMap.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, stored] of this.storeMap.entries()) {
      if (now - stored.timestamp > this.ttlMs) {
        this.storeMap.delete(key);
      }
    }
  }
}

// Export singleton instance
export const idempotencyManager = new IdempotencyManager();

