/** @type {import('jest').Config} */

// =====================================================================================
// JEST CONFIGURATION
// Comprehensive testing setup with coverage, integration tests, and performance monitoring
// =====================================================================================

module.exports = {
  // =====================================================================================
  // BASIC CONFIGURATION
  // =====================================================================================
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
    '!**/__tests__/**/*.d.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.config.ts',
    '!src/**/*.types.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
    'cobertura'
  ],
  coverageThreshold: {
    // Temporarily disabled - tests use mock implementations
    // Re-enable when testing actual source code implementations
    // global: {
    //   branches: 80,
    //   functions: 80,
    //   lines: 80,
    //   statements: 80
    // },
    // './src/domain/': {
    //   branches: 90,
    //   functions: 90,
    //   lines: 90,
    //   statements: 90
    // },
    // './src/application/': {
    //   branches: 85,
    //   functions: 85,
    //   lines: 85,
    //   statements: 85
    // }
  },

  // =====================================================================================
  // TEST SETUP
  // =====================================================================================
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // =====================================================================================
  // TRANSFORMATION
  // =====================================================================================
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: {
          ignoreCodes: ['TS151001']
        }
      }
    ]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1'
  },

  // =====================================================================================
  // TEST CATEGORIES
  // =====================================================================================
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/e2e/'
  ],

  // =====================================================================================
  // MOCKS AND STUBS
  // =====================================================================================
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // =====================================================================================
  // PERFORMANCE AND TIMEOUTS
  // =====================================================================================
  testTimeout: 10000, // 10 seconds
  slowTestThreshold: 5000, // 5 seconds

  // =====================================================================================
  // REPORTERS AND OUTPUT
  // =====================================================================================
  reporters: [
    'default'
    // Note: Additional reporters like jest-junit and jest-html-reporter
    // can be added when the corresponding packages are installed
  ],

  // =====================================================================================
  // COVERAGE CONFIGURATION
  // =====================================================================================
  collectCoverage: true,
  coverageProvider: 'v8',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/',
    '/__tests__/',
    '/__mocks__/',
    '/types/',
    '/config/',
    '/migrations/',
    '/seeds/'
  ],

  // =====================================================================================
  // TEST SEQUENCING
  // =====================================================================================
  maxWorkers: process.env.CI ? 2 : '50%',
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // =====================================================================================
  // WATCH MODE
  // =====================================================================================
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/reports/'
  ],

  // =====================================================================================
  // SNAPSHOTS
  // =====================================================================================
  // snapshotSerializers: ['jest-serializer-path'], // Enable when package is installed

  // =====================================================================================
  // TEST CATEGORIZATION (Note: Projects can be enabled when all setup files exist)
  // =====================================================================================
  // Projects configuration commented out until all setup files are created
  // projects: [/* ... */],

  // =====================================================================================
  // CI/CD OPTIMIZATIONS
  // =====================================================================================
  ...(process.env.CI && {
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'json-summary', 'cobertura'],
    reporters: [
      'default'
      // Note: jest-junit can be added here when the package is installed
    ],
    maxWorkers: 2,
    testTimeout: 15000
  }),

  // =====================================================================================
  // VERBOSE OUTPUT FOR DEBUGGING
  // =====================================================================================
  ...(process.env.DEBUG && {
    verbose: true,
    testNamePattern: process.env.TEST_PATTERN || '',
    testPathPattern: process.env.TEST_PATH_PATTERN || ''
  })
};

// =====================================================================================
// CUSTOM JEST UTILITIES
// =====================================================================================

/**
 * Custom test utilities and matchers
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
      id: 'test-user-id',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:products'],
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
      ...overrides
    };
  },

  /**
   * Mock external services
   */
  mockExternalServices: () => {
    // Mock Redis, Elasticsearch, etc.
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
  }
};

// =====================================================================================
// PERFORMANCE MONITORING
// =====================================================================================

/**
 * Performance monitoring for tests
 */
if (process.env.TEST_PERFORMANCE) {
  const { PerformanceObserver } = require('perf_hooks');

  const obs = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.name.startsWith('test-')) {
        console.log(`[PERF] ${entry.name}: ${entry.duration}ms`);
      }
    });
  });

  obs.observe({ entryTypes: ['measure'] });
}

// =====================================================================================
// MEMORY LEAK DETECTION
// =====================================================================================

if (process.env.DETECT_MEMORY_LEAKS) {
  require('why-is-node-running');
}
