import Redis from 'ioredis';

export class RedisPresenceStore {
  constructor(private readonly redis: Redis) {}

  async setOnline(userId: string): Promise<void> {
    await this.redis.set(`chat:presence:${userId}`, '1', 'EX', 60);
  }

  async isOnline(userId: string): Promise<boolean> {
    const val = await this.redis.get(`chat:presence:${userId}`);
    return val === '1';
  }

  async refresh(userId: string): Promise<void> {
    await this.redis.expire(`chat:presence:${userId}`, 60);
  }
}
