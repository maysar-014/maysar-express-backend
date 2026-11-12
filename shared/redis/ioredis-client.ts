/**
 * Maysar Engineering — Redis Connection Pool Configuration
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 10: Database Engineering — Connection management and pooling shall be controlled
 *   - Article 7: Resource Efficiency Doctrine — Database processing and connections
 *   - Article 21: Performance Monitoring — Database connection utilization
 * 
 * Provides a shared Redis client with controlled connection pool limits to prevent
 * connection exhaustion under concurrent load.
 */

import Redis from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const sharedClients = new Map<string, Redis>();

type RedisClient = Redis;

const REDIS_POOL_CONFIG = {
  enableAutoPipelining: true,
  maxRetries: 10,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  connectTimeout: 10000,
  family: 4,
  keepAlive: true,
  maxAge: 0,
} as const;

const attachRedisErrorHandlers = (client: RedisClient, label?: string): void => {
  const anyClient = client as RedisClient & { __maysarErrorHandlersAttached?: boolean };
  if (anyClient.__maysarErrorHandlersAttached) return;
  anyClient.__maysarErrorHandlersAttached = true;

  const prefix = label ? `redis:${label}` : 'redis';

  if (typeof client.on !== 'function') {
    return;
  }

  client.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[${prefix}] error`, message);
  });

  client.on('end', () => {
    console.warn(`[${prefix}] connection closed`);
  });

  client.on('connect', () => {
    const prefixStr = label ? `redis:${label}` : 'redis';
    console.info(`[${prefixStr}] connected`);
  });

  client.on('reconnecting', (delay: number) => {
    const prefixStr = label ? `redis:${label}` : 'redis';
    console.warn(`[${prefixStr}] reconnecting in ${delay}ms`);
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

  const client = new Redis(url, {
    enableAutoPipelining: REDIS_POOL_CONFIG.enableAutoPipelining,
    maxRetries: REDIS_POOL_CONFIG.maxRetries,
    retryStrategy: REDIS_POOL_CONFIG.retryStrategy,
    connectTimeout: REDIS_POOL_CONFIG.connectTimeout,

    family: REDIS_POOL_CONFIG.family,
    keepAlive: REDIS_POOL_CONFIG.keepAlive,
    maxAge: REDIS_POOL_CONFIG.maxAge,
  });
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
