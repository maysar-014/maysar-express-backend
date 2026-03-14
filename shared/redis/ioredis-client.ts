import Redis from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const sharedClients = new Map<string, Redis>();

export function resolveRedisUrl(redisUrl?: string): string {
  return redisUrl || process.env.REDIS_URL || DEFAULT_REDIS_URL;
}

export function getSharedRedisClient(redisUrl?: string): Redis {
  const url = resolveRedisUrl(redisUrl);
  const existing = sharedClients.get(url);
  if (existing) {
    return existing;
  }

  const client = new Redis(url);
  sharedClients.set(url, client);
  return client;
}

export async function pingSharedRedis(redisUrl?: string): Promise<boolean> {
  try {
    const client = getSharedRedisClient(redisUrl);
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

