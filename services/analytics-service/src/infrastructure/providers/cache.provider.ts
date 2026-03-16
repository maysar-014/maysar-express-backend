import { getSharedRedisClient } from '@shared/redis/ioredis-client';

export class CacheProvider {
    private readonly redis = getSharedRedisClient();

    async get<T>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);
        if (!value) return null;

        try {
            return JSON.parse(value) as T;
        } catch {
            return value as unknown as T;
        }
    }

    async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
        const serialized = JSON.stringify(value);
        await this.redis.setex(key, ttlSeconds, serialized);
    }

    async invalidate(pattern: string): Promise<void> {
        await this.redis.del(pattern);
    }

    async has(key: string): Promise<boolean> {
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
}
