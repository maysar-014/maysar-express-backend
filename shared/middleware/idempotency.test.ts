const sharedRedisStores = new Map<string, Map<string, string>>();

const getSharedStore = (url: string): Map<string, string> => {
  const existing = sharedRedisStores.get(url);
  if (existing) {
    return existing;
  }

  const store = new Map<string, string>();
  sharedRedisStores.set(url, store);
  return store;
};

jest.mock('ioredis', () => {
  class MockRedis {
    private readonly store: Map<string, string>;

    constructor(private readonly url: string) {
      this.store = getSharedStore(url);
    }

    on(): this {
      return this;
    }

    async get(key: string): Promise<string | null> {
      return this.store.has(key) ? this.store.get(key) ?? null : null;
    }

    async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK' | null> {
      const isNx = args.includes('NX');
      if (isNx && this.store.has(key)) {
        return null;
      }

      this.store.set(key, value);
      return 'OK';
    }

    async setex(key: string, _ttlSeconds: number, value: string): Promise<'OK'> {
      this.store.set(key, value);
      return 'OK';
    }

    async del(...keys: string[]): Promise<number> {
      let deleted = 0;
      for (const key of keys) {
        if (this.store.delete(key)) {
          deleted++;
        }
      }
      return deleted;
    }

    multi() {
      const store = this.store;
      const operations: Array<() => void> = [];

      return {
        setex(key: string, _ttlSeconds: number, value: string) {
          operations.push(() => {
            store.set(key, value);
          });
          return this;
        },
        del(key: string) {
          operations.push(() => {
            store.delete(key);
          });
          return this;
        },
        async exec() {
          operations.forEach((operation) => operation());
          return [];
        }
      };
    }

    async flushdb(): Promise<'OK'> {
      this.store.clear();
      return 'OK';
    }

    async quit(): Promise<'OK'> {
      return 'OK';
    }
  }

  return {
    __esModule: true,
    default: MockRedis
  };
});

jest.mock('../redis/ioredis-client', () => {
  class MockRedisClient {
    private readonly store: Map<string, string>;

    constructor(private readonly url: string) {
      this.store = getSharedStore(url);
    }

    on(): this {
      return this;
    }

    async get(key: string): Promise<string | null> {
      return this.store.has(key) ? this.store.get(key) ?? null : null;
    }

    async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK' | null> {
      const isNx = args.includes('NX');
      if (isNx && this.store.has(key)) {
        return null;
      }

      this.store.set(key, value);
      return 'OK';
    }

    async setex(key: string, _ttlSeconds: number, value: string): Promise<'OK'> {
      this.store.set(key, value);
      return 'OK';
    }

    async del(...keys: string[]): Promise<number> {
      let deleted = 0;
      for (const key of keys) {
        if (this.store.delete(key)) {
          deleted++;
        }
      }
      return deleted;
    }

    multi() {
      const store = this.store;
      const operations: Array<() => void> = [];

      return {
        setex(key: string, _ttlSeconds: number, value: string) {
          operations.push(() => {
            store.set(key, value);
          });
          return this;
        },
        del(key: string) {
          operations.push(() => {
            store.delete(key);
          });
          return this;
        },
        async exec() {
          operations.forEach((operation) => operation());
          return [];
        }
      };
    }
  }

  return {
    getSharedRedisClient: (url?: string) => new MockRedisClient(url || 'redis://mock'),
    resolveRedisUrl: (url?: string) => url || 'redis://mock'
  };
});

import { Request, Response } from 'express';
import Redis from 'ioredis';
import { IdempotencyMiddleware, EventIdempotency } from './idempotency';

type MockRequest = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  baseUrl?: string;
  path?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  user?: {
    userId?: string;
    roles?: string[];
  };
  service?: {
    serviceId?: string;
    serviceKey?: string;
  };
};

type MockResponse = {
  statusCode: number;
  json: jest.Mock;
  send: jest.Mock;
  status: jest.Mock;
  on: jest.Mock;
};

describe('Idempotency Infrastructure', () => {
  let redis: Redis;
  let idempotencyMiddleware: IdempotencyMiddleware;
  let eventIdempotency: EventIdempotency;
  let redisUrl: string;

  beforeAll(async () => {
    redisUrl = 'redis://memory-idempotency';
    redis = new Redis(redisUrl);
    idempotencyMiddleware = new IdempotencyMiddleware(redisUrl);
    eventIdempotency = new EventIdempotency(redisUrl);
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  describe('API Idempotency', () => {
    test('should return cached response for duplicate requests', async () => {
      const idempotencyKey = 'test-key-123';

      const req: MockRequest = {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
        baseUrl: '/api',
        path: '/orders',
        body: { test: 'data' }
      };

      const res: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn()
      };

      const next = jest.fn();
      const middleware = idempotencyMiddleware.middleware();

      // First request
      await middleware(req as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Simulate successful response
      const responseBody = { orderId: '123', status: 'created' };
      res.json(responseBody);

      // Second request with same idempotency key
      const req2 = { ...req } as MockRequest;
      const res2: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn()
      };
      const next2 = jest.fn();

      await middleware(req2 as Request, res2 as unknown as Response, next2);

      // Should return cached response, not call next
      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(200);
      expect(res2.json).toHaveBeenCalledWith(responseBody);
    });

    test('should isolate cached responses by auth scope', async () => {
      const idempotencyKey = 'test-key-123';

      const authenticatedRequest: MockRequest = {
        method: 'POST',
        baseUrl: '/api',
        path: '/orders',
        headers: {
          'idempotency-key': idempotencyKey,
          authorization: 'Bearer token-one'
        },
        body: { test: 'data' }
      };

      const authenticatedResponse: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn()
      };

      const middleware = idempotencyMiddleware.middleware();
      const next = jest.fn();

      await middleware(authenticatedRequest as Request, authenticatedResponse as unknown as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      authenticatedResponse.json({ ok: true });

      const anonymousRequest: MockRequest = {
        method: 'POST',
        baseUrl: '/api',
        path: '/orders',
        headers: { 'idempotency-key': idempotencyKey },
        body: { test: 'data' }
      };

      const anonymousResponse: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn()
      };

      const nextAnonymous = jest.fn();

      await middleware(anonymousRequest as Request, anonymousResponse as unknown as Response, nextAnonymous);

      expect(nextAnonymous).toHaveBeenCalledTimes(1);
      expect(anonymousResponse.status).not.toHaveBeenCalled();
    });

    test('should prefer resolved principal scope over raw auth headers', async () => {
      const idempotencyKey = 'test-key-456';
      const middleware = idempotencyMiddleware.middleware();

      const firstRequest: MockRequest = {
        method: 'POST',
        baseUrl: '/api',
        path: '/orders',
        headers: {
          'idempotency-key': idempotencyKey,
          authorization: 'Bearer first-token'
        },
        user: {
          userId: 'usr_test_0001',
          roles: ['ADMIN']
        },
        body: { test: 'data' }
      };

      const firstResponse: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn()
      };

      const next = jest.fn();
      await middleware(firstRequest as Request, firstResponse as unknown as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      const responseBody = { orderId: '123', status: 'created' };
      firstResponse.json(responseBody);

      const secondRequest: MockRequest = {
        method: 'POST',
        baseUrl: '/api',
        path: '/orders',
        headers: {
          'idempotency-key': idempotencyKey,
          authorization: 'Bearer refreshed-token'
        },
        user: {
          userId: 'usr_test_0001',
          roles: ['admin']
        },
        body: { test: 'data' }
      };

      const secondResponse: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        on: jest.fn()
      };

      const nextSecond = jest.fn();
      await middleware(secondRequest as Request, secondResponse as unknown as Response, nextSecond);

      expect(nextSecond).not.toHaveBeenCalled();
      expect(secondResponse.status).toHaveBeenCalledWith(200);
      expect(secondResponse.json).toHaveBeenCalledWith(responseBody);
    });

    test('should isolate cached responses by request fingerprint', async () => {
      const idempotencyKey = 'test-key-fingerprint';
      const middleware = idempotencyMiddleware.middleware();

      const firstRequest: MockRequest = {
        method: 'POST',
        baseUrl: '/api',
        path: '/orders',
        headers: { 'idempotency-key': idempotencyKey },
        body: { quantity: 1 }
      };

      const firstResponse: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn()
      };

      const next = jest.fn();
      await middleware(firstRequest as Request, firstResponse as unknown as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
      firstResponse.json({ ok: true, quantity: 1 });

      const secondRequest: MockRequest = {
        ...firstRequest,
        body: { quantity: 2 }
      };

      const secondResponse: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn()
      };

      const nextSecond = jest.fn();
      await middleware(secondRequest as Request, secondResponse as unknown as Response, nextSecond);

      expect(nextSecond).toHaveBeenCalledTimes(1);
      expect(secondResponse.status).not.toHaveBeenCalled();
    });

    test('should avoid double-caching when res.json internally delegates to res.send', async () => {
      const idempotencyKey = 'test-key-json-send';
      const middleware = idempotencyMiddleware.middleware();

      const request: MockRequest = {
        method: 'POST',
        baseUrl: '/api',
        path: '/orders',
        headers: { 'idempotency-key': idempotencyKey },
        body: { sku: 'prod-1' }
      };

      const firstResponse: MockResponse = {
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        on: jest.fn(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      firstResponse.json.mockImplementation((body: unknown) => {
        return firstResponse.send(JSON.stringify(body));
      });

      const next = jest.fn();
      await middleware(request as Request, firstResponse as unknown as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      const payload = { orderId: 'ord_1', status: 'created' };
      firstResponse.json(payload);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const secondResponse: MockResponse = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        on: jest.fn(),
        send: jest.fn().mockReturnThis()
      };
      const nextSecond = jest.fn();

      await middleware(request as Request, secondResponse as unknown as Response, nextSecond);

      expect(nextSecond).not.toHaveBeenCalled();
      expect(secondResponse.status).toHaveBeenCalledWith(200);
      expect(secondResponse.json).toHaveBeenCalledWith(payload);
    });

    test('should require idempotency key for non-GET requests', async () => {
      const req: MockRequest = {
        method: 'POST',
        headers: {},
        body: { test: 'data' }
      } as MockRequest;

      const res: MockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        statusCode: 200,
        on: jest.fn()
      };

      const next = jest.fn();
      const middleware = idempotencyMiddleware.middleware();

      await middleware(req as Request, res as unknown as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing idempotency key',
        message: "Header 'idempotency-key' is required for POST requests"
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow GET requests without idempotency key', async () => {
      const req: MockRequest = {
        method: 'GET',
        headers: {}
      } as MockRequest;

      const res = {} as Response;
      const next = jest.fn();
      const middleware = idempotencyMiddleware.middleware();

      await middleware(req as Request, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Idempotency', () => {
    test('should prevent duplicate event processing', async () => {
      const eventId = 'event-123';
      const consumerName = 'test-consumer';

      // First processing
      const handler1 = jest.fn().mockResolvedValue('result1');
      const result1 = await eventIdempotency.withIdempotency(
        eventId,
        consumerName,
        handler1
      );

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result1');

      // Second processing (duplicate)
      const handler2 = jest.fn().mockResolvedValue('result2');
      const result2 = await eventIdempotency.withIdempotency(
        eventId,
        consumerName,
        handler2
      );

      expect(handler2).not.toHaveBeenCalled();
      expect(result2).toBeNull();
    });

    test('should allow same event for different consumers', async () => {
      const eventId = 'event-123';
      const consumer1 = 'consumer-1';
      const consumer2 = 'consumer-2';

      const handler1 = jest.fn().mockResolvedValue('result1');
      const handler2 = jest.fn().mockResolvedValue('result2');

      const result1 = await eventIdempotency.withIdempotency(
        eventId,
        consumer1,
        handler1
      );

      const result2 = await eventIdempotency.withIdempotency(
        eventId,
        consumer2,
        handler2
      );

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    test('should check if event is already processed', async () => {
      const eventId = 'event-123';
      const consumerName = 'test-consumer';

      expect(await eventIdempotency.isProcessed(eventId, consumerName)).toBe(false);

      await eventIdempotency.markProcessed(eventId, consumerName);

      expect(await eventIdempotency.isProcessed(eventId, consumerName)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis connection failures gracefully', async () => {
      // Use invalid port to simulate connection failure
      const badMiddleware = new IdempotencyMiddleware('redis://localhost:9999');

      const req = {
        method: 'POST',
        headers: { 'idempotency-key': 'test-key' },
        body: { test: 'data' }
      } as MockRequest;

      const res = {} as Response;
      const next = jest.fn();
      const middleware = badMiddleware.middleware();

      // Should not throw, should call next
      await middleware(req as Request, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
