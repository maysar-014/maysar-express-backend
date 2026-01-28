// @ts-nocheck
/**
 * Test Setup File
 * Configures the testing environment and provides global test utilities
 * Authority: Testing Constitution v1.0
 * 
 * Responsibilities:
 * - Environment configuration
 * - Global utilities and helpers
 * - Test data factories
 * - Mock implementations
 * - Logging and debugging utilities
 */

// =====================================================================================
// ENVIRONMENT SETUP
// =====================================================================================

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-do-not-use-in-production';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error'; // Minimize log noise in tests

// =====================================================================================
// CONSOLE SUPPRESSION - Reduce noise during test runs
// =====================================================================================

const originalConsole = { ...global.console };

global.console = {
  ...originalConsole,
  // Keep error for debugging
  error: originalConsole.error,
  // Suppress info and debug in non-debug mode
  ...(process.env.DEBUG !== 'true' && {
    info: () => {},
    debug: () => {},
    log: () => {}
  })
};

// =====================================================================================
// GLOBAL TEST UTILITIES
// =====================================================================================

global.testUtils = {
  /**
   * Reset all mocks
   */
  resetAllMocks: () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  },

  /**
   * Wait for async operation
   */
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create mock Express Request object
   */
  createMockRequest: (overrides = {}) => {
    return {
      body: {},
      query: {},
      params: {},
      headers: {},
      user: null,
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/test',
      ...overrides
    };
  },

  /**
   * Create mock Express Response object
   */
  createMockResponse: (overrides = {}) => {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      ...overrides
    };
  },

  /**
   * Create mock Next function
   */
  createMockNext: () => jest.fn(),

  /**
   * Create complete Express middleware context
   */
  createMockContext: (req = {}, res = {}, next = jest.fn()) => {
    return {
      req: global.testUtils.createMockRequest(req),
      res: global.testUtils.createMockResponse(res),
      next: next || jest.fn()
    };
  }
};

// =====================================================================================
// TEST DATA FACTORIES
// =====================================================================================

/**
 * User Domain Factories
 * Creates realistic test data following Testing Constitution requirements
 */
global.userFactories = {
  /**
   * Create a valid Email value object
   */
  createEmail: (email = 'test@example.com') => {
    return {
      value: email,
      toString: () => email,
      equals: (other: any) => other?.value === email
    };
  },

  /**
   * Create a valid PhoneNumber value object
   */
  createPhoneNumber: (phone = '+255712345678') => {
    return {
      value: phone,
      countryCode: 'TZ',
      toString: () => phone,
      equals: (other: any) => other?.value === phone
    };
  },

  /**
   * Create a valid Address value object
   */
  createAddress: (overrides = {}) => {
    return {
      street: '123 Main St',
      city: 'Dar es Salaam',
      state: 'Dar es Salaam',
      postalCode: '00001',
      country: 'Tanzania',
      ...overrides,
      toString: function () {
        return `${this.street}, ${this.city}, ${this.country}`;
      },
      equals: function (other: any) {
        return (
          other?.street === this.street &&
          other?.city === this.city &&
          other?.country === this.country
        );
      }
    };
  },

  /**
   * Create a valid User domain entity
   */
  createUser: (overrides = {}) => {
    const defaultUser = {
      id: `user-${Date.now()}`,
      email: global.userFactories.createEmail('test@example.com'),
      phoneNumber: global.userFactories.createPhoneNumber('+255712345678'),
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      role: 'BUYER',
      status: 'active',
      emailVerified: false,
      phoneVerified: false,
      preferredLanguage: 'sw',
      preferredCurrency: 'TZS',
      addresses: [global.userFactories.createAddress()],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };

    return defaultUser;
  },

  /**
   * Create a valid CreateUserDto
   */
  createCreateUserDto: (overrides = {}) => {
    return {
      email: 'test@example.com',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: 'BUYER',
      preferredLanguage: 'sw',
      preferredCurrency: 'TZS',
      ...overrides
    };
  },

  /**
   * Create a valid UpdateUserDto
   */
  createUpdateUserDto: (overrides = {}) => {
    return {
      firstName: 'Jane',
      lastName: 'Smith',
      preferredLanguage: 'en',
      preferredCurrency: 'USD',
      ...overrides
    };
  },

  /**
   * Create a valid UserPreferences object
   */
  createUserPreferences: (overrides = {}) => {
    return {
      theme: 'light',
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true
      },
      language: 'sw',
      currency: 'TZS',
      timezone: 'Africa/Dar_es_Salaam',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      accessibility: {
        highContrast: false,
        fontSize: 'normal',
        screenReader: false
      },
      ...overrides
    };
  }
};

// =====================================================================================
// MOCK SERVICES
// =====================================================================================

/**
 * In-memory implementations for testing
 */
global.mockServices = {
  /**
   * In-memory Email Service
   */
  InMemoryEmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
    sendSecurityAlert: jest.fn().mockResolvedValue({ success: true })
  })),

  /**
   * In-memory Notification Service
   */
  InMemoryNotificationService: jest.fn().mockImplementation(() => ({
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
    publishEvent: jest.fn().mockResolvedValue({ success: true })
  })),

  /**
   * In-memory Cache Service
   */
  InMemoryCacheService: jest.fn().mockImplementation(() => {
    const cache = new Map();
    return {
      get: jest.fn((key: string) => cache.get(key)),
      set: jest.fn((key: string, value: any, ttl?: number) => {
        cache.set(key, value);
        return true;
      }),
      delete: jest.fn((key: string) => cache.delete(key)),
      clear: jest.fn(() => cache.clear())
    };
  })
};

// =====================================================================================
// GLOBAL TEST HOOKS
// =====================================================================================

/**
 * Before each test
 */
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();

  // Clear any test-specific state
  if ((global as any).testState) {
    (global as any).testState = {};
  }
});

/**
 * After each test
 */
afterEach(() => {
  // Restore all mocks
  jest.restoreAllMocks();

  // Clear timers
  jest.clearAllTimers();
});

/**
 * After all tests
 */
afterAll(() => {
  // Restore original console
  global.console = originalConsole;

  // Cleanup global state
  if ((global as any).testState) {
    delete (global as any).testState;
  }
});

// =====================================================================================
// CUSTOM MATCHERS (if needed in future)
// =====================================================================================

expect.extend({
  /**
   * Custom matcher: Check if array is sorted
   */
  toBeSorted(received: any[]) {
    const pass = received.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
    return {
      pass,
      message: () =>
        pass
          ? `Expected array not to be sorted`
          : `Expected array to be sorted. Received: ${JSON.stringify(received)}`
    };
  },

  /**
   * Custom matcher: Check if number is within range
   */
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be between ${min} and ${max}`
          : `Expected ${received} to be between ${min} and ${max}`
    };
  }
});

// =====================================================================================
// DECLARE CUSTOM MATCHERS FOR TYPESCRIPT
// =====================================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeSorted(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }

  var testUtils: {
    resetAllMocks: () => void;
    waitFor: (ms: number) => Promise<void>;
    createMockRequest: (overrides?: any) => any;
    createMockResponse: (overrides?: any) => any;
    createMockNext: () => jest.Mock;
    createMockContext: (req?: any, res?: any, next?: jest.Mock) => any;
  };

  var userFactories: {
    createEmail: (email?: string) => any;
    createPhoneNumber: (phone?: string) => any;
    createAddress: (overrides?: any) => any;
    createUser: (overrides?: any) => any;
    createCreateUserDto: (overrides?: any) => any;
    createUpdateUserDto: (overrides?: any) => any;
    createUserPreferences: (overrides?: any) => any;
  };

  var mockServices: {
    InMemoryEmailService: jest.Mock;
    InMemoryNotificationService: jest.Mock;
    InMemoryCacheService: jest.Mock;
  };
}

// =====================================================================================
// EXPORT FOR EXTERNAL USE
// =====================================================================================

export { };
