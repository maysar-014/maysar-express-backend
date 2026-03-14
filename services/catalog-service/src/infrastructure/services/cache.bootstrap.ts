import { config } from '../../config';
import { CacheServiceFactory, CacheServiceConfig } from './cache.service';

function resolveCacheProvider(): CacheServiceConfig['provider'] {
  const configuredProvider = config.externalServices.cache.provider;
  const redisUrl = config.externalServices.cache.redis?.url;

  if (configuredProvider === 'redis') {
    if (!redisUrl) {
      console.warn('[CACHE] CACHE_PROVIDER=redis but REDIS_URL is missing; falling back to memory.');
      return 'memory';
    }
    return 'redis';
  }

  if (configuredProvider === 'memory') {
    return 'memory';
  }

  // Memcached is not implemented in CacheServiceConfig yet.
  console.warn(`[CACHE] CACHE_PROVIDER=${configuredProvider} is not supported; falling back to memory.`);
  return 'memory';
}

export function initializeCacheService(): void {
  if (CacheServiceFactory.getInstance()) {
    return;
  }

  const provider = resolveCacheProvider();
  const cacheService = CacheServiceFactory.create({
    provider,
    defaultTtl: 300,
    keyPrefix: 'catalog',
    enableMetrics: true,
    enableCompression: false,
    enableSerialization: true,
    redisUrl: config.externalServices.cache.redis?.url
  });

  CacheServiceFactory.setInstance(cacheService);
}
