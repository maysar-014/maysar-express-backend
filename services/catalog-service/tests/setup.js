/**
 * Global Test Setup
 * Configures the testing environment and global test utilities
 */

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

// Global test utilities
global.testUtils = {
  setupTestDb: async () => {
    // Implementation for test database setup
  },

  cleanupTestDb: async () => {
    // Implementation for test database cleanup
  },

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

  createTestContext: (overrides = {}) => {
    return {
      userId: 'test-user-id',
      correlationId: 'test-correlation-id',
      requestId: 'test-request-id',
      timestamp: new Date(),
      ...overrides
    };
  },

  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  generateTestId: (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
};

// Custom Jest matchers
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

// Global test hooks
beforeAll(async () => {
  console.log('[TEST] Setting up test environment...');
  
  if (process.env.TEST_DB_SETUP) {
    await global.testUtils.setupTestDb();
  }
});

afterAll(async () => {
  if (process.env.TEST_DB_CLEANUP) {
    await global.testUtils.cleanupTestDb();
  }
  
  console.log('[TEST] Test environment cleanup completed');
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Test helpers
global.TestDataFactory = {
  product: (overrides = {}) => global.testUtils.createTestProduct(overrides),
  user: (overrides = {}) => global.testUtils.createTestUser(overrides),
  productDTO: (overrides = {}) => global.testUtils.createTestProductDTO(overrides),
  context: (overrides = {}) => global.testUtils.createTestContext(overrides),
};

global.TestUtils = {
  wait: global.testUtils.wait,
  generateId: global.testUtils.generateTestId,
  setupMiddleware: global.testUtils.setupTestMiddleware,
};