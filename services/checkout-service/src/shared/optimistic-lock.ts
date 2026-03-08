/**
 * Optimistic Lock
 * Delegates to RedisLock for distributed locking
 */

import { RedisLock } from '../../../../shared/locking/redis-lock';

const DEFAULT_TTL_MS = 5000;

export class OptimisticLock {
  private heldLocks: Set<string> = new Set();

  constructor(private readonly redisLock: RedisLock) {}

  async acquire(key: string): Promise<boolean> {
    const acquired = await this.redisLock.acquire(key, DEFAULT_TTL_MS);
    if (acquired) {
      this.heldLocks.add(key);
      return true;
    }
    return false;
  }

  async release(key: string): Promise<void> {
    if (this.heldLocks.has(key)) {
      await this.redisLock.release(key);
      this.heldLocks.delete(key);
    }
  }
}
