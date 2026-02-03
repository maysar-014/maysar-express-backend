import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';

const DEFAULT_LIMIT = 100;
const WINDOW_MS = 60 * 1000; // 1 minute
const store = new Map<string, { count: number; resetAt: number }>();

function getKey(req: Request): string {
  const userId = (req as any).userId || req.ip || 'anonymous';
  return `${req.path}:${userId}`;
}

export const rateLimit = (options?: { limit?: number; windowMs?: number }) => (req: Request, res: Response, next: NextFunction): void => {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const key = getKey(req);
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  entry.count++;
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
  if (entry.count > limit) {
    next(createError.tooManyRequests('Rate limit exceeded'));
    return;
  }
  next();
};
