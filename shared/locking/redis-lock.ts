import { randomUUID } from 'crypto';

interface RedisLockClient {
  set: (key: string, value: string, ...args: (string | number)[]) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  eval?: (script: string, numKeys: number, ...args: (string | number)[]) => Promise<number | null>;
}

interface RedisLockOptions {
  retries?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  keyPrefix?: string;
}

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
  private readonly maxRetryDelayMs: number;
  private readonly keyPrefix: string;
  private readonly ownedTokens = new Map<string, string>();

  constructor(private readonly redis: RedisLockClient, options?: RedisLockOptions) {
    this.retries = options?.retries ?? 3;
    this.retryDelayMs = options?.retryDelayMs ?? 100;
    this.maxRetryDelayMs = options?.maxRetryDelayMs ?? 1000;
    this.keyPrefix = options?.keyPrefix ?? 'lock:';
  }

  async acquireLock(key: string, ttl: number = 5000): Promise<boolean> {
    const lockKey = this.resolveLockKey(key);
    const token = await this.acquireWithRetry(lockKey, ttl);
    if (!token) {
      return false;
    }

    this.ownedTokens.set(lockKey, token);
    return true;
  }

  async acquire(key: string, ttl: number = 5000): Promise<boolean> {
    return this.acquireLock(key, ttl);
  }

  async releaseLock(key: string): Promise<void> {
    const lockKey = this.resolveLockKey(key);
    const token = this.ownedTokens.get(lockKey);
    if (!token) {
      return;
    }

    try {
      await this.compareAndDelete(lockKey, token);
    } finally {
      this.ownedTokens.delete(lockKey);
    }
  }

  async release(key: string): Promise<void> {
    return this.releaseLock(key);
  }

  async withLock<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
  async withLock<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T>;
  async withLock<T>(
    key: string,
    fnOrTtl: (() => Promise<T>) | number,
    maybeFnOrTtl?: (() => Promise<T>) | number
  ): Promise<T> {
    const { fn, ttl } = this.resolveWithLockArgs(fnOrTtl, maybeFnOrTtl);
    const acquired = await this.acquireLock(key, ttl);
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }

  private async acquireWithRetry(lockKey: string, ttl: number): Promise<string | null> {
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const token = await this.tryAcquire(lockKey, ttl);
      if (token) {
        return token;
      }

      if (attempt < this.retries) {
        await this.sleep(this.getRetryDelay(attempt));
      }
    }

    return null;
  }

  private async tryAcquire(lockKey: string, ttl: number): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(lockKey, token, 'PX', ttl, 'NX');
    return result === 'OK' ? token : null;
  }

  private async compareAndDelete(lockKey: string, token: string): Promise<void> {
    if (!this.redis.eval) {
      // Without Lua support we cannot safely compare-and-delete, so we let TTL expire naturally.
      return;
    }

    await this.redis.eval(RELEASE_LUA_SCRIPT, 1, lockKey, token);
  }

  private resolveLockKey(key: string): string {
    return key.startsWith(this.keyPrefix) ? key : `${this.keyPrefix}${key}`;
  }

  private getRetryDelay(attempt: number): number {
    const exponentialDelay = this.retryDelayMs * 2 ** attempt;
    return Math.min(exponentialDelay, this.maxRetryDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private resolveWithLockArgs<T>(
    fnOrTtl: (() => Promise<T>) | number,
    maybeFnOrTtl?: (() => Promise<T>) | number
  ): { fn: () => Promise<T>; ttl: number } {
    if (typeof fnOrTtl === 'function') {
      const ttl = typeof maybeFnOrTtl === 'number' ? maybeFnOrTtl : 5000;
      return { fn: fnOrTtl, ttl };
    }

    if (typeof maybeFnOrTtl !== 'function') {
      throw new Error('withLock requires an async callback function.');
    }

    return { fn: maybeFnOrTtl, ttl: fnOrTtl };
  }
}
