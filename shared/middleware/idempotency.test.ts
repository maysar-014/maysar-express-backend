import { IdempotencyMiddleware, EventIdempotency } from './idempotency';
import { Request, Response } from 'express';
import Redis from 'ioredis';

describe('Idempotency Infrastructure', () => {
  let redis: Redis;
  let idempotencyMiddleware: IdempotencyMiddleware;
  let eventIdempotency: EventIdempotency;

  beforeAll(() => {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    idempotencyMiddleware = new IdempotencyMiddleware('redis://localhost:6379');
    eventIdempotency = new EventIdempotency('redis://localhost:6379');
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
      
      const req = {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
        body: { test: 'data' }
      } as Request;

      const res = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      } as unknown as Response;

      const next = jest.fn();
      const middleware = idempotencyMiddleware.middleware();

      // First request
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Simulate successful response
      const responseBody = { orderId: '123', status: 'created' };
      res.json(responseBody);

      // Second request with same idempotency key
      const req2 = { ...req };
      const res2 = {
        statusCode: 200,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      } as unknown as Response;
      const next2 = jest.fn();

      await middleware(req2, res2, next2);
      
      // Should return cached response, not call next
      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(200);
      expect(res2.json).toHaveBeenCalledWith(responseBody);
    });

    test('should require idempotency key for non-GET requests', async () => {
      const req = {
        method: 'POST',
        headers: {},
        body: { test: 'data' }
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      } as unknown as Response;

      const next = jest.fn();
      const middleware = idempotencyMiddleware.middleware();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing idempotency key',
        message: "Header 'idempotency-key' is required for POST requests"
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow GET requests without idempotency key', async () => {
      const req = {
        method: 'GET',
        headers: {}
      } as Request;

      const res = {} as Response;
      const next = jest.fn();
      const middleware = idempotencyMiddleware.middleware();

      await middleware(req, res, next);

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
      const badMiddleware = new IdempotencyMiddleware('redis://invalid:6379');
      
      const req = {
        method: 'POST',
        headers: { 'idempotency-key': 'test-key' },
        body: { test: 'data' }
      } as Request;

      const res = {} as Response;
      const next = jest.fn();
      const middleware = badMiddleware.middleware();

      // Should not throw, should call next
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});