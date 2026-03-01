import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

interface IdempotencyConfig {
  ttlSeconds: number;
  keyPrefix: string;
  headerName: string;
  generateKey?: (req: Request) => string;
}

export class IdempotencyMiddleware {
  private redis: Redis;
  private config: IdempotencyConfig;

  constructor(
    redisUrl: string,
    config: Partial<IdempotencyConfig> = {}
  ) {
    this.redis = new Redis(redisUrl);
    this.config = {
      ttlSeconds: 24 * 60 * 60, // 24 hours
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

      const cacheKey = `${this.config.keyPrefix}${idempotencyKey}`;
      
      try {
        // Check if request was already processed
        const cachedResponse = await this.redis.get(cacheKey);
        
        if (cachedResponse) {
          const { statusCode, body } = JSON.parse(cachedResponse);
          return res.status(statusCode).json(body);
        }

        // Store original response methods
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Intercept response
        res.json = (body: any) => {
          this.cacheResponse(cacheKey, res.statusCode, body);
          return originalJson.call(res, body);
        };

        res.send = (body: any) => {
          this.cacheResponse(cacheKey, res.statusCode, body);
          return originalSend.call(res, body);
        };

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

  private async cacheResponse(key: string, statusCode: number, body: any): Promise<void> {
    try {
      const response = { statusCode, body };
      await this.redis.setex(key, this.config.ttlSeconds, JSON.stringify(response));
    } catch (error) {
      console.error('Failed to cache idempotent response:', error);
    }
  }

  async clearKey(idempotencyKey: string): Promise<void> {
    const cacheKey = `${this.config.keyPrefix}${idempotencyKey}`;
    await this.redis.del(cacheKey);
  }
}

// Event consumer idempotency
export class EventIdempotency {
  private redis: Redis;
  private prisma?: PrismaClient;
  private keyPrefix = 'event:processed:';
  private ttlSeconds = 24 * 60 * 60; // 24 hours

  constructor(redisUrl: string, prisma?: PrismaClient) {
    this.redis = new Redis(redisUrl);
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
          data: { eventId, consumerName }
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
          data: { eventId, consumerName }
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
    userId: (req.user as any)?.id || 'anonymous'
  };
  
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 32);
}