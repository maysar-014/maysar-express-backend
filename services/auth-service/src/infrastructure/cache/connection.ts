import { attachRedisErrorHandlers, getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';

export const redis = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));
attachRedisErrorHandlers(redis, 'auth-service-cache');

export async function initializeRedis(): Promise<void> {
  await redis.ping();
}
