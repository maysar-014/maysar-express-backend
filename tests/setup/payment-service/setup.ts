// @ts-nocheck
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') });

// Keep payment-service test runs fully in-memory.
process.env.NODE_ENV = 'test';
process.env.METRICS_ENABLED = 'false';
process.env.PAYMENT_RATE_LIMIT_DISABLED = 'true';

const mockCreatePipeline = () => {
  const pipeline = {
    setex: jest.fn(() => pipeline),
    del: jest.fn(() => pipeline),
    exec: jest.fn(async () => [])
  };

  return pipeline;
};

const mockRedisClient = {
  on: jest.fn(),
  get: jest.fn(async () => null),
  set: jest.fn(async () => 'OK'),
  setex: jest.fn(async () => 'OK'),
  del: jest.fn(async () => 1),
  eval: jest.fn(async () => [1, 60000]),
  ping: jest.fn(async () => 'PONG'),
  quit: jest.fn(async () => 'OK'),
  disconnect: jest.fn(),
  multi: jest.fn(() => mockCreatePipeline())
};

jest.mock('../../../shared/redis/ioredis-client', () => ({
  getSharedRedisClient: jest.fn(() => mockRedisClient),
  resolveRedisUrl: jest.fn((redisUrl?: string) => redisUrl || 'redis://mock'),
  attachRedisErrorHandlers: jest.fn()
}));

// Global setup for payment-service
beforeAll(async () => {
  // Setup logic here
});

afterAll(async () => {
  // Teardown logic here
});
