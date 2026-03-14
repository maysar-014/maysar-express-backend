import { Request, Response, NextFunction } from 'express';
import expressRateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '@shared/middleware/redis-rate-limit.store';
import { getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';
import { createError } from './error.middleware';

const DEFAULT_LIMIT = 100;
const WINDOW_MS = 60 * 1000; // 1 minute

const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));

function getKey(req: Request): string {
  const userId = (req as any).userId || req.ip || 'anonymous';
  return `${req.path}:${userId}`;
}

export const rateLimit = (options?: { limit?: number; windowMs?: number; prefix?: string }) => {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const prefix = options?.prefix ?? 'rl:notification:';

  return expressRateLimit({
    windowMs,
    max: limit,
    keyGenerator: getKey,
    store: new RedisRateLimitStore(redisClient, prefix),
    passOnStoreError: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(createError.tooManyRequests('Rate limit exceeded'));
    }
  });
};
