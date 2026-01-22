/**
 * Global Test Setup
 * Configures the testing environment and global test utilities
 */

import { jest } from '@jest/globals';

// =====================================================================================
// ENVIRONMENT SETUP
// =====================================================================================

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep log and warn for debugging, but suppress info and debug in CI
  ...(process.env.CI && {
    info: jest.fn(),
    debug: jest.fn(),
  }),
};

// =====================================================================================
// GLOBAL TEST UTILITIES
// =====================================================================================

/**
 * Test Utilities
 */
global.testUtils = {
  /**
   * Setup test database
   */
  setupTestDb: async () => {
    // Implementation for test database setup
  },

  /**
   * Cleanup test database
   */
  cleanupTestDb: async () => {
    // Implementation for test database cleanup
  },

  /**
   * Create test user
   */
  createTestUser: (overrides = {}) => {
    return {
      userId: 'test-user-id',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:products'],
      sessionId: 'test-session-id',
      deviceId: 'test-device-id',
      ipAddress: '127.0.0.1',
      userAgent: 'Test/1.0',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
      ...overrides
    };
  },

  /**
   * Create test product
   */
  createTestProduct: (overrides = {}) => {
    return {
      id: 'test-product-id',
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      category: 'electronics',
      sku: 'TEST-001',
      inventory: 100,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  },

  /**
   * Create test product DTO
   */
  createTestProductDTO: (overrides = {}) => {
    return {
      id: 'test-product-id',
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      category: 'electronics',
      sku: 'TEST-001',
      inventory: 100,
      status: 'active',
      ...overrides
    };
  },

  /**
   * Mock external services
   */
  mockExternalServices: () => {
    // Mock Redis
    jest.mock('redis', () => ({
      createClient: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        expire: jest.fn(),
      })),
    }));

    // Mock Kafka
    jest.mock('kafkajs', () => ({
      Kafka: jest.fn(() => ({
        producer: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          send: jest.fn(),
        })),
        consumer: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          subscribe: jest.fn(),
          run: jest.fn(),
        })),
      })),
    }));
  },

  /**
   * Setup test middleware
   */
  setupTestMiddleware: (req = {}, res = {}, next = jest.fn()) => {
    const mockReq = {
      body: {},
      query: {},
      params: {},
      headers: {},
      user: null,
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/test',
      ...req
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      ...res
    };

    return { mockReq, mockRes, next };
  },

  /**
   * Create test context
   */
  createTestContext: (overrides = {}) => {
    return {
      userId: 'test-user-id',
      correlationId: 'test-correlation-id',
      requestId: 'test-request-id',
      timestamp: new Date(),
      ...overrides
    };
  },

  /**
   * Wait for async operations
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate test ID
   */
  generateTestId: (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
};

// =====================================================================================
// JEST EXTENSIONS
// =====================================================================================

/**
 * Custom Jest matchers
 */
expect.extend({
  toBeValidProduct(received) {
    const pass = received &&
                 typeof received.id === 'string' &&
                 typeof received.name === 'string' &&
                 typeof received.price === 'number' &&
                 received.price > 0;

    return {
      message: () => `expected ${received} to be a valid product`,
      pass,
    };
  },

  toBeValidUser(received) {
    const pass = received &&
                 typeof received.userId === 'string' &&
                 typeof received.email === 'string' &&
                 Array.isArray(received.roles);

    return {
      message: () => `expected ${received} to be a valid user`,
      pass,
    };
  },

  toHaveValidPermissions(received) {
    const pass = Array.isArray(received) &&
                 received.every(perm => typeof perm === 'string' && perm.includes(':'));

    return {
      message: () => `expected ${received} to have valid permissions`,
      pass,
    };
  },
});

// =====================================================================================
// GLOBAL TEST HOOKS
// =====================================================================================

// Global beforeAll
beforeAll(async () => {
  // Setup test environment
  console.log('[TEST] Setting up test environment...');

  // Mock external services
  global.testUtils.mockExternalServices();

  // Setup test database if needed
  if (process.env.TEST_DB_SETUP) {
    await global.testUtils.setupTestDb();
  }
});

// Global afterAll
afterAll(async () => {
  // Cleanup test database if needed
  if (process.env.TEST_DB_CLEANUP) {
    await global.testUtils.cleanupTestDb();
  }

  console.log('[TEST] Test environment cleanup completed');
});

// Global beforeEach
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();

  // Reset test utilities
  jest.clearAllTimers();
});

// =====================================================================================
// TEST HELPERS
// =====================================================================================

/**
 * Test Data Factories
 */
export const TestDataFactory = {
  product: (overrides = {}) => global.testUtils.createTestProduct(overrides),
  user: (overrides = {}) => global.testUtils.createTestUser(overrides),
  productDTO: (overrides = {}) => global.testUtils.createTestProductDTO(overrides),
  context: (overrides = {}) => global.testUtils.createTestContext(overrides),
};

/**
 * Test Assertions
 */
export const TestAssertions = {
  isValidProduct: (obj: any) => expect(obj).toBeValidProduct(),
  isValidUser: (obj: any) => expect(obj).toBeValidUser(),
  hasValidPermissions: (perms: any) => expect(perms).toHaveValidPermissions(),
};

/**
 * Test Utilities
 */
export const TestUtils = {
  wait: global.testUtils.wait,
  generateId: global.testUtils.generateTestId,
  setupMiddleware: global.testUtils.setupTestMiddleware,
};

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidProduct(): R;
      toBeValidUser(): R;
      toHaveValidPermissions(): R;
    }
  }

  var testUtils: {
    setupTestDb: () => Promise<void>;
    cleanupTestDb: () => Promise<void>;
    createTestUser: (overrides?: any) => any;
    createTestProduct: (overrides?: any) => any;
    createTestProductDTO: (overrides?: any) => any;
    mockExternalServices: () => void;
    setupTestMiddleware: (req?: any, res?: any, next?: any) => any;
    wait: (ms: number) => Promise<void>;
    generateTestId: (prefix?: string) => string;
    createTestContext: (overrides?: any) => any;
  };
}
