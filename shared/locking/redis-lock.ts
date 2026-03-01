import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { AppError } from '../errors/app-error';

export class LockAcquisitionError extends AppError {
  constructor(key: string) {
    super(
      `Failed to acquire distributed lock for key: ${key}`,
      { key },
      423
    );
    this.name = 'LockAcquisitionError';
  }
}

// Lua script: atomically check token and delete only if it matches
const RELEASE_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export class RedisLock {
  private readonly retries: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly redis: Redis,
    options?: { retries?: number; retryDelayMs?: number }
  ) {
    this.retries = options?.retries ?? 3;
    this.retryDelayMs = options?.retryDelayMs ?? 200;
  }

  /**
   * Attempt to acquire a lock for the given key.
   * Returns a unique token on success, or null on failure.
   */
  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const lockKey = `lock:${key}`;

    const result = await this.redis.set(lockKey, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  /**
   * Release a lock only if the caller owns it (token matches).
   */
  async release(key: string, token: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.redis.eval(RELEASE_LUA_SCRIPT, 1, lockKey, token);
  }

  /**
   * Acquire a lock, run the provided function, and release the lock in `finally`.
   * Retries acquisition up to `this.retries` times with a short sleep between attempts.
   * Throws LockAcquisitionError if the lock cannot be acquired after all retries.
   */
  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    let token: string | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      token = await this.acquire(key, ttlMs);
      if (token) break;

      if (attempt < this.retries) {
        await this.sleep(this.retryDelayMs);
      }
    }

    if (!token) {
      throw new LockAcquisitionError(key);
    }

    try {
      return await fn();
    } finally {
      await this.release(key, token);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
