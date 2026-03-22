import Redis from 'ioredis';
import { attachRedisErrorHandlers } from '@shared/redis/ioredis-client';

export class CacheProvider {
    private readonly redis: Redis;

    constructor() {
        const host = process.env.REDIS_HOST || 'localhost';
        const port = Number(process.env.REDIS_PORT) || 6379;
        this.redis = new Redis({
            host,
            port,
            retryStrategy: (times) => Math.min(times * 50, 2000)
        });
        attachRedisErrorHandlers(this.redis, 'analytics-service');
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.redis.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.redis.set(key, value);
        }
    }

    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }
}
