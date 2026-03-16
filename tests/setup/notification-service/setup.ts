import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') });

// Mock shared Redis client to avoid open handles in tests
jest.mock('@shared/redis/ioredis-client', () => {
  const mockClient = {
    eval: jest.fn().mockResolvedValue([0, 0]),
    decr: jest.fn().mockResolvedValue(0),
    del: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG')
  };
  return {
    resolveRedisUrl: jest.fn().mockImplementation((url?: string) => url || 'redis://mock'),
    getSharedRedisClient: jest.fn().mockReturnValue(mockClient),
    pingSharedRedis: jest.fn().mockResolvedValue(true)
  };
});

// Global setup for notification-service
beforeAll(async () => {
  // Setup logic here
});

afterAll(async () => {
  // Teardown logic here
});
