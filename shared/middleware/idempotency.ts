import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getSharedRedisClient, resolveRedisUrl } from '../redis/ioredis-client';
import { getModelPrefix, makeId } from '../ids/id';

interface IdempotencyConfig {
  ttlSeconds: number;
  keyPrefix: string;
  headerName: string;
  lockTtlSeconds: number;
  waitForResponseMs: number;
  generateKey?: (req: Request) => string;
}

export class IdempotencyMiddleware {
  private redis: Redis;
  private config: IdempotencyConfig;

  constructor(
    redisUrl: string,
    config: Partial<IdempotencyConfig> = {}
  ) {
    this.redis = getSharedRedisClient(resolveRedisUrl(redisUrl));
    this.config = {
      ttlSeconds: 24 * 60 * 60, // 24 hours
      lockTtlSeconds: 30,
      waitForResponseMs: 1200,
      keyPrefix: 'idempotency:',
      headerName: 'idempotency-key',
      ...config
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Only enforce idempotency for POST, PUT, and DELETE
      if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
        return next();
      }

      const idempotencyKey = this.getIdempotencyKey(req);
      
      if (!idempotencyKey) {
        return res.status(400).json({
          error: 'Missing idempotency key',
          message: `Header '${this.config.headerName}' is required for ${req.method} requests`
        });
      }

      const cacheKey = this.buildCacheKey(req, idempotencyKey);
      const lockKey = `${cacheKey}:lock`;
      
      try {
        // Check if request was already processed
        const cachedResponse = await this.redis.get(cacheKey);
        
        if (cachedResponse) {
          const { statusCode, body } = JSON.parse(cachedResponse);
          return res.status(statusCode).json(body);
        }

        const lockAcquired = await this.redis.set(
          lockKey,
          '1',
          'EX',
          this.config.lockTtlSeconds,
          'NX'
        );

        if (!lockAcquired) {
          const delayedResponse = await this.waitForCachedResponse(cacheKey);
          if (delayedResponse) {
            return res.status(delayedResponse.statusCode).json(delayedResponse.body);
          }

          return res.status(409).json({
            error: 'Request already in progress',
            message: 'A request with this idempotency key is currently being processed.'
          });
        }

        // Store original response methods
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Intercept response
        res.json = (body: any) => {
          this.cacheResponse(cacheKey, lockKey, res.statusCode, body);
          return originalJson.call(res, body);
        };

        res.send = (body: any) => {
          this.cacheResponse(cacheKey, lockKey, res.statusCode, body);
          return originalSend.call(res, body);
        };

        if (typeof res.on === 'function') {
          res.on('close', () => {
            // Ensure abandoned requests don't leave a stale in-flight lock behind
            void this.redis.del(lockKey);
          });
        }

        next();
      } catch (error) {
        console.error('Idempotency middleware error:', error);
        next();
      }
    };
  }

  private getIdempotencyKey(req: Request): string | null {
    // Check header first
    const headerKey = req.headers[this.config.headerName] as string;
    if (headerKey) return headerKey;

    // Use custom key generator if provided
    if (this.config.generateKey) {
      return this.config.generateKey(req);
    }

    return null;
  }

  private async cacheResponse(key: string, lockKey: string, statusCode: number, body: any): Promise<void> {
    try {
      const response = { statusCode, body };
      await this.redis
        .multi()
        .setex(key, this.config.ttlSeconds, JSON.stringify(response))
        .del(lockKey)
        .exec();
    } catch (error) {
      console.error('Failed to cache idempotent response:', error);
      await this.redis.del(lockKey);
    }
  }

  async clearKey(idempotencyKey: string): Promise<void> {
    const cacheKey = `${this.config.keyPrefix}${idempotencyKey}`;
    await this.redis.del(cacheKey, `${cacheKey}:lock`);
  }

  private async waitForCachedResponse(
    cacheKey: string
  ): Promise<{ statusCode: number; body: any } | null> {
    const deadline = Date.now() + this.config.waitForResponseMs;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const cachedResponse = await this.redis.get(cacheKey);
      if (!cachedResponse) {
        continue;
      }

      try {
        return JSON.parse(cachedResponse) as { statusCode: number; body: any };
      } catch {
        return null;
      }
    }

    return null;
  }

  private buildCacheKey(req: Request, idempotencyKey: string): string {
    const scopedPath = `${req.baseUrl || ''}${req.path}`;
    const cacheScope = `${req.method.toUpperCase()}:${scopedPath}`;
    const requesterScope = this.getRequesterScope(req);
    const requestFingerprint = this.hashValue(this.serializeRequestFingerprint(req));
    return `${this.config.keyPrefix}${cacheScope}:${requesterScope}:${idempotencyKey}:${requestFingerprint}`;
  }

  private serializeRequestFingerprint(req: Request): string {
    const fingerprint = {
      params: this.normalizeValue(req.params || {}),
      query: this.normalizeValue(req.query || {}),
      body: this.normalizeValue(req.body ?? {})
    };

    return JSON.stringify(fingerprint);
  }

  private normalizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value ?? null;
    }

    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.normalizeValue(entry));
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.normalizeValue((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      return String(value);
    }

    return value;
  }

  private getRequesterScope(req: Request): string {
    const resolvedScope = this.getResolvedRequesterScope(req);
    if (resolvedScope) {
      return resolvedScope;
    }

    const fallbackScope = this.getHeaderRequesterScope(req);
    if (fallbackScope) {
      return fallbackScope;
    }

    return 'anonymous';
  }

  private getResolvedRequesterScope(req: Request): string | null {
    const user = (req as any).user as { userId?: string; roles?: unknown } | undefined;
    const service = (req as any).service as { serviceId?: string; serviceKey?: string } | undefined;

    if (!user && !service) {
      return null;
    }

    const parts: string[] = ['principal'];
    const userId = typeof user?.userId === 'string' ? user.userId : '';
    const userRoles = this.normalizeRoles(user?.roles);
    const serviceId = typeof service?.serviceId === 'string' ? service.serviceId : '';
    const serviceKey = typeof service?.serviceKey === 'string' ? service.serviceKey : '';

    if (userId) {
      parts.push(`user:${userId}`);
    }

    if (userRoles.length) {
      parts.push(`roles:${userRoles.join(',')}`);
    }

    if (serviceId || serviceKey) {
      parts.push(`service:${serviceId || this.hashValue(serviceKey)}`);
    }

    return parts.join(':');
  }

  private getHeaderRequesterScope(req: Request): string | null {
    const parts: string[] = [];
    const userId = this.getHeaderValue(req.headers['x-user-id']);
    const roles = this.normalizeRoles(this.getHeaderValue(req.headers['x-user-roles'])?.split(','));
    const authorization = this.getHeaderValue(req.headers.authorization);
    const serviceKey = this.getHeaderValue(req.headers['x-service-key']);
    const contractTest = this.getHeaderValue(req.headers['x-contract-test']);

    if (userId) {
      parts.push(`user:${userId}`);
    }

    if (roles.length) {
      parts.push(`roles:${roles.join(',')}`);
    }

    if (authorization) {
      parts.push(`authorization:${this.hashValue(authorization)}`);
    }

    if (serviceKey) {
      parts.push(`service:${this.hashValue(serviceKey)}`);
    }

    if (contractTest) {
      parts.push(`contract:${contractTest}`);
    }

    if (!parts.length) {
      return null;
    }

    return `header:${parts.join(':')}`;
  }

  private getHeaderValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : undefined;
    }

    return typeof value === 'string' ? value : undefined;
  }

  private normalizeRoles(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((role) => String(role).trim().toLowerCase())
      .filter(Boolean)
      .sort();
  }

  private hashValue(value: string): string {
    return createHash('sha256')
      .update(value)
      .digest('hex')
      .substring(0, 16);
  }
}

// Event consumer idempotency
export class EventIdempotency {
  private redis: Redis;
  private prisma?: PrismaClient;
  private keyPrefix = 'event:processed:';
  private ttlSeconds = 24 * 60 * 60; // 24 hours

  constructor(redisUrl: string, prisma?: PrismaClient) {
    this.redis = getSharedRedisClient(resolveRedisUrl(redisUrl));
    this.prisma = prisma;
  }

  async isProcessed(eventId: string, consumerName: string): Promise<boolean> {
    const key = `${this.keyPrefix}${consumerName}:${eventId}`;

    // Fast path: check Redis first
    try {
      const redisResult = await this.redis.get(key);
      if (redisResult !== null) return true;
    } catch (error) {
      console.error('Redis isProcessed check failed, falling back to DB:', error);
    }

    // Fallback: check database
    if (this.prisma) {
      try {
        const dbResult = await this.prisma.eventLog.findUnique({
          where: { eventId_consumerName: { eventId, consumerName } }
        });
        if (dbResult) {
          // Re-populate Redis cache for future fast-path hits
          try {
            await this.redis.setex(key, this.ttlSeconds, '1');
          } catch { /* ignore Redis write failure */ }
          return true;
        }
      } catch (error) {
        console.error('DB isProcessed check failed:', error);
      }
    }

    return false;
  }

  async markProcessed(eventId: string, consumerName: string): Promise<void> {
    const key = `${this.keyPrefix}${consumerName}:${eventId}`;

    const redisWrite = this.redis.setex(key, this.ttlSeconds, '1').catch((error) => {
      console.error('Redis markProcessed failed:', error);
    });

    const dbWrite = this.prisma
      ? this.prisma.eventLog.create({
          data: { id: makeId(getModelPrefix('EventLog')), eventId, consumerName }
        }).catch((error: any) => {
          // Ignore unique constraint violations (race condition / duplicate)
          if (error?.code === 'P2002') {
            return; // Duplicate key is expected and non-fatal
          }
          // Propagate all other DB failures so upstream can retry
          throw error;
        })
      : Promise.resolve();

    await Promise.all([redisWrite, dbWrite]);
  }

  async withIdempotency<T>(
    eventId: string,
    consumerName: string,
    handler: () => Promise<T>
  ): Promise<T | null> {
    const key = `${this.keyPrefix}${consumerName}:${eventId}`;

    if (!this.prisma) {
      const claimed = await this.redis.set(key, '1', 'EX', this.ttlSeconds, 'NX');
      if (!claimed) {
        return null;
      }

      try {
        return await handler();
      } catch (error) {
        await this.redis.del(key);
        throw error;
      }
    }

    // Fast path: check Redis cache first
    try {
      const redisResult = await this.redis.get(key);
      if (redisResult !== null) {
        console.log(`Event ${eventId} already processed by ${consumerName} (Redis fast-path)`);
        return null;
      }
    } catch (error) {
      console.error('Redis fast-path check failed, falling back to DB claim:', error);
    }

    // Atomic DB claim: attempt insert; if duplicate key, skip execution
    if (this.prisma) {
      try {
        await this.prisma.eventLog.create({
          data: { id: makeId(getModelPrefix('EventLog')), eventId, consumerName }
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          // Already claimed/processed by another handler
          console.log(`Event ${eventId} already processed by ${consumerName} (DB claim)`);
          // Re-populate Redis cache for future fast-path hits
          try {
            await this.redis.setex(key, this.ttlSeconds, '1');
          } catch { /* ignore Redis write failure */ }
          return null;
        }
        // Non-duplicate DB error – propagate so caller can retry
        throw error;
      }
    }

    // Execute handler; roll back DB claim on failure so retries remain possible
    try {
      const result = await handler();

      // Success: populate Redis cache
      try {
        await this.redis.setex(key, this.ttlSeconds, '1');
      } catch (error) {
        console.error('Redis cache write after handler success failed:', error);
      }

      return result;
    } catch (handlerError) {
      // Roll back the DB claim so the event can be retried
      if (this.prisma) {
        try {
          await this.prisma.eventLog.delete({
            where: { eventId_consumerName: { eventId, consumerName } }
          });
        } catch (rollbackError) {
          console.error('Failed to roll back DB claim after handler error:', rollbackError);
        }
      }
      throw handlerError;
    }
  }
}

// Generate idempotency key helper
export function generateIdempotencyKey(req: Request): string {
  const data: Record<string, unknown> = {
    method: req.method,
    path: req.path,
    body: req.body,
    userId: (req as any).user?.userId || 'anonymous'
  };
  
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 32);
}
