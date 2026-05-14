import Redis from 'ioredis';

export class RedisRateLimiter {
  constructor(private readonly redis: Redis) {}

  async checkConversationLimit(
    userId: string,
  ): Promise<{ allowed: boolean; count: number }> {
    const key = `chat:ratelimit:conv:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 3600);
    return { allowed: count <= 20, count };
  }

  async checkMessageLimit(
    userId: string,
  ): Promise<{ allowed: boolean; count: number }> {
    const key = `chat:ratelimit:msg:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 3600);
    return { allowed: count <= 200, count };
  }

  async checkMassMsgPattern(userId: string, contentHash: string): Promise<number> {
    const key = `chat:ratelimit:massmsg:${userId}:${contentHash}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 300);
    return count;
  }
}
