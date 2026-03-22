import Redis from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const sharedClients = new Map<string, Redis>();

type RedisClient = Redis;

const attachRedisErrorHandlers = (client: RedisClient, label?: string): void => {
  const anyClient = client as RedisClient & { __maysarErrorHandlersAttached?: boolean };
  if (anyClient.__maysarErrorHandlersAttached) return;
  anyClient.__maysarErrorHandlersAttached = true;

  const prefix = label ? `redis:${label}` : 'redis';

  client.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    // Avoid throwing from error handlers; log and keep process alive.
    console.warn(`[${prefix}] error`, message);
  });

  client.on('end', () => {
    console.warn(`[${prefix}] connection closed`);
  });
};

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
  attachRedisErrorHandlers(client, url);
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

export { attachRedisErrorHandlers };

