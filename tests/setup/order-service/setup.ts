/**
 * Test Setup Configuration
 * Global test setup and utilities for Order Service tests
 */

import { jest } from '@jest/globals';

// Extend global types for test utilities
declare global {
  var testUtils: {
    generateId: () => string;
    generateTimestamp: () => string;
    deepClone: <T>(obj: T) => T;
    wait: (ms: number) => Promise<void>;
    createMockRequest: (overrides?: any) => any;
    createMockResponse: (overrides?: any) => any;
    createMockNext: () => jest.MockedFunction<any>;
  };
}

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-anon-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

// Global test utilities
global.testUtils = {
  // Generate test IDs
  generateId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Generate test timestamps
  generateTimestamp: () => new Date().toISOString(),

  // Deep clone for test data
  deepClone: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)),

  // Wait helper for async tests
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock request/response objects
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/test',
    headers: {},
    body: {},
    params: {},
    query: {},
    ip: '127.0.0.1',
    get: jest.fn((header: string) => undefined),
    ...overrides
  }),

  createMockResponse: (overrides = {}) => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn((header: string) => undefined),
    ...overrides
  }),

  createMockNext: () => jest.fn()
};

// Setup Jest matchers
expect.extend({
  toBeValidOrder(received) {
    const pass = received &&
                typeof received === 'object' &&
                received.id &&
                received.buyerId &&
                received.sellerId &&
                received.items &&
                Array.isArray(received.items) &&
                received.status;

    return {
      message: () => `expected ${received} to be a valid order object`,
      pass
    };
  },

  toBeValidPayment(received) {
    const pass = received &&
                typeof received === 'object' &&
                received.id &&
                received.orderId &&
                received.amount &&
                received.currency &&
                received.status;

    return {
      message: () => `expected ${received} to be a valid payment object`,
      pass
    };
  }
});

// Mock external services
jest.mock('../src/infrastructure/database/prisma-order.repository');
jest.mock('../src/infrastructure/database/supabase-order.repository');
jest.mock('../src/infrastructure/cache/redis-cache');
jest.mock('../src/infrastructure/monitoring/logger');
jest.mock('../src/infrastructure/monitoring/metrics');
jest.mock('../src/infrastructure/messaging/event-publisher');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    orderItem: {
      create: jest.fn(),
      createMany: jest.fn()
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    settlement: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((callback: any) => callback())
  }))
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    // single: jest.fn().mockResolvedValue({ data: null, error: null })
  })
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    incrby: jest.fn(),
    smembers: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    status: 'ready',
    on: jest.fn(),
    emit: jest.fn()
  }));
});

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(),
    remove: jest.fn()
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock prom-client
jest.mock('prom-client', () => ({
  register: {
    clear: jest.fn(),
    getMetricsAsJSON: jest.fn(),
    metrics: jest.fn()
  },
  collectDefaultMetrics: jest.fn(),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    inc: jest.fn(),
    dec: jest.fn(),
    labels: jest.fn().mockReturnThis(),
    observe: jest.fn()
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    startTimer: jest.fn().mockReturnValue(jest.fn()),
    labels: jest.fn().mockReturnThis()
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
    labels: jest.fn().mockReturnThis()
  }))
}));

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Global test timeout for async operations
jest.setTimeout(30000);

// Export test utilities
export const testUtils = global.testUtils;
