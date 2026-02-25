import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { createHash } from 'crypto';

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
      // Only apply to non-GET requests
      if (req.method === 'GET') {
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
  private keyPrefix = 'event:processed:';
  private ttlSeconds = 24 * 60 * 60; // 24 hours

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async isProcessed(eventId: string, consumerName: string): Promise<boolean> {
    const key = `${this.keyPrefix}${consumerName}:${eventId}`;
    const result = await this.redis.get(key);
    return result !== null;
  }

  async markProcessed(eventId: string, consumerName: string): Promise<void> {
    const key = `${this.keyPrefix}${consumerName}:${eventId}`;
    await this.redis.setex(key, this.ttlSeconds, '1');
  }

  async withIdempotency<T>(
    eventId: string,
    consumerName: string,
    handler: () => Promise<T>
  ): Promise<T | null> {
    if (await this.isProcessed(eventId, consumerName)) {
      console.log(`Event ${eventId} already processed by ${consumerName}`);
      return null;
    }

    const result = await handler();
    await this.markProcessed(eventId, consumerName);
    return result;
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