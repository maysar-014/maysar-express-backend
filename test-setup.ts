/**
 * Global Test Setup - Root Level
 * Runs after each test environment is set up
 */

import { jest } from '@jest/globals';

// =====================================================================================
// GLOBAL TEST ENVIRONMENT SETUP
// =====================================================================================

// Set global test environment
process.env.NODE_ENV = 'test';
process.env.TZ = 'UTC';

// Configure Jest timeouts
jest.setTimeout(10000);

// =====================================================================================
// GLOBAL TEST UTILITIES
// =====================================================================================

/**
 * Global test utilities available across all services
 */
global.testUtils = {
  /**
   * Setup test database (service-specific implementations)
   */
  setupTestDb: async (service?: string) => {
    // Implementation varies by service
    console.log(`Setting up test database for ${service || 'unknown service'}`);
  },

  /**
   * Cleanup test database
   */
  cleanupTestDb: async (service?: string) => {
    console.log(`Cleaning up test database for ${service || 'unknown service'}`);
  },

  /**
   * Create test user (generic)
   */
  createTestUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    roles: ['user'],
    permissions: ['read'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  /**
   * Create test product (generic)
   */
  createTestProduct: (overrides = {}) => ({
    id: 'test-product-id',
    name: 'Test Product',
    description: 'A test product',
    price: 99.99,
    category: 'general',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  /**
   * Mock external services (Redis, Kafka, etc.)
   * Note: Service-specific mocks should be implemented in each service's test setup
   */
  mockExternalServices: () => {
    // Common external service mocks - implement in service-specific setup files
    console.log('Mock external services - implement in service-specific setup');
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
   * Generate test data
   */
  generateTestData: {
    id: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: () => `test-${Date.now()}@example.com`,
    date: (daysFromNow = 0) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date;
    },
    uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  },

  /**
   * Test helpers
   */
  helpers: {
    /**
     * Wait for async operations
     */
    wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Retry async operation
     */
    retry: async (fn: () => Promise<any>, attempts = 3, delay = 1000) => {
      for (let i = 0; i < attempts; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === attempts - 1) throw error;
          await global.testUtils.helpers.wait(delay);
        }
      }
    },

    /**
     * Deep clone object
     */
    deepClone: (obj: any) => JSON.parse(JSON.stringify(obj)),

    /**
     * Generate random data
     */
    random: {
      string: (length = 10) => Math.random().toString(36).substr(2, length),
      number: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
      boolean: () => Math.random() > 0.5,
      array: (length = 5, generator = () => Math.random()) =>
        Array.from({ length }, generator),
      pick: (array: any[]) => array[Math.floor(Math.random() * array.length)]
    }
  }
};

// =====================================================================================
// GLOBAL TEST HOOKS
// =====================================================================================

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset global state if needed
  // This ensures test isolation
});

afterEach(() => {
  // Cleanup after each test
  // Verify no global state pollution
});

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

declare global {
  var testUtils: {
    setupTestDb: (service?: string) => Promise<void>;
    cleanupTestDb: (service?: string) => Promise<void>;
    createTestUser: (overrides?: any) => any;
    createTestProduct: (overrides?: any) => any;
    mockExternalServices: () => void;
    setupTestMiddleware: (req?: any, res?: any, next?: any) => any;
    generateTestData: {
      id: () => string;
      email: () => string;
      date: (daysFromNow?: number) => Date;
      uuid: () => string;
    };
    helpers: {
      wait: (ms: number) => Promise<void>;
      retry: (fn: () => Promise<any>, attempts?: number, delay?: number) => Promise<any>;
      deepClone: (obj: any) => any;
      random: {
        string: (length?: number) => string;
        number: (min?: number, max?: number) => number;
        boolean: () => boolean;
        array: (length?: number, generator?: () => any) => any[];
        pick: (array: any[]) => any;
      };
    };
  };
}
