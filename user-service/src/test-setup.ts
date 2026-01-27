/**
 * Test Setup
 * Global test configuration and setup for the User Service
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'maysar_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Custom Jest matchers
expect.extend({
  toBeValidUser(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.email === 'string' &&
      typeof received.firstName === 'string' &&
      typeof received.lastName === 'string' &&
      typeof received.createdAt === 'string' &&
      typeof received.updatedAt === 'string';

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid user`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid user`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: any) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidPhoneNumber(received: any) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    const pass = typeof received === 'string' && phoneRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid phone number`,
        pass: false,
      };
    }
  },

  toBeValidAddress(received: any) {
    const pass = received &&
      typeof received.street === 'string' &&
      typeof received.city === 'string' &&
      typeof received.country === 'string' &&
      typeof received.postalCode === 'string';

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid address`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid address`,
        pass: false,
      };
    }
  },
});

// Mock external services for testing
jest.mock('@infrastructure/services/email.service', () => ({
  InMemoryEmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendSecurityAlert: jest.fn(),
  })),
}));

jest.mock('@infrastructure/services/cache.service', () => ({
  InMemoryCacheService: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    flush: jest.fn(),
    increment: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
});