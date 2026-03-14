import type Redis from 'ioredis';
import { getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';
import { RedisLock } from '@shared/locking/redis-lock';
import { StockEngine } from '../../domain/engines/stock.engine';

export type RedisReservationMode = 'off' | 'shadow';

export function resolveRedisReservationMode(): RedisReservationMode {
  const rawMode = (process.env.INVENTORY_REDIS_RESERVATIONS_MODE || '').toLowerCase();

  if (rawMode === 'shadow') {
    return 'shadow';
  }

  if (rawMode && rawMode !== 'off') {
    console.warn(`[INVENTORY] Unknown INVENTORY_REDIS_RESERVATIONS_MODE="${rawMode}", defaulting to "off".`);
  }

  return process.env.REDIS_URL ? 'shadow' : 'off';
}

export function createRedisStockEngine(): { stockEngine: StockEngine; redisClient: Redis; redisLock: RedisLock } {
  const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));
  const redisLock = new RedisLock(redisClient as any);
  const stockEngine = new StockEngine(redisClient as any, redisLock);

  return { stockEngine, redisClient, redisLock };
}
