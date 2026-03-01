/**
 * Optimistic Lock
 * Delegates to RedisLock for distributed locking
 */

import { RedisLock } from '../../../../shared/locking/redis-lock';

const DEFAULT_TTL_MS = 5000;

export class OptimisticLock {
  private tokenMap: Map<string, string> = new Map();

  constructor(private readonly redisLock: RedisLock) {}

  async acquire(key: string): Promise<boolean> {
    const token = await this.redisLock.acquire(key, DEFAULT_TTL_MS);
    if (token) {
      this.tokenMap.set(key, token);
      return true;
    }
    return false;
  }

  async release(key: string): Promise<void> {
    const token = this.tokenMap.get(key);
    if (token) {
      await this.redisLock.release(key, token);
      this.tokenMap.delete(key);
    }
  }
}
