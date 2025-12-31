import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  // Store prisma instance globally for tests
  (global as any).__prisma = prisma;
});

afterAll(async () => {
  // Cleanup
  const prisma = (global as any).__prisma;
  if (prisma) {
    await prisma.$disconnect();
  }
});

// Clean up after each test
afterEach(async () => {
  const prisma = (global as any).__prisma;
  if (prisma) {
    // Clear all tables or reset database state
    try {
      // Add cleanup logic here based on your test needs
      // For example: await prisma.user.deleteMany();
    } catch (error) {
      console.warn('Error during test cleanup:', error);
    }
  }
});

// Mock external services
jest.mock('../config/environment', () => ({
  getConfig: () => ({
    NODE_ENV: 'test',
    PORT: 3000,
    JWT_SECRET: 'test-jwt-secret',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    REDIS_URL: 'redis://localhost:6379',
    // Add other config values as needed
  }),
}));

// Mock Redis for testing
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      setex: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    }),
  })) as any;
});

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
}));

// Helper functions for tests
export const createTestUser = async (overrides = {}) => {
  const prisma = (global as any).__prisma;
  return await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: 'hashed-password',
      ...overrides,
    },
  });
};

export const createTestProduct = async (overrides = {}) => {
  const prisma = (global as any).__prisma;
  return await prisma.product.create({
    data: {
      title: `Test Product ${Date.now()}`,
      price: 100,
      ...overrides,
    },
  });
};

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
    }
  }
}
