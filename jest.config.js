/** @type {import('jest').Config} */

// =====================================================================================
// ROOT JEST CONFIGURATION - Monorepo Test Setup
// Handles testing across multiple services in the Maysar backend
// =====================================================================================

module.exports = {
  // =====================================================================================
  // BASIC CONFIGURATION
  // =====================================================================================
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/catalog-service/src',
    '<rootDir>/catalog-service/tests'
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
    '!**/__tests__/**/*.d.ts'
  ],

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
    '^@/(.*)$': '<rootDir>/$1',
    '^@catalog/(.*)$': '<rootDir>/catalog-service/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@types/(.*)$': '<rootDir>/types/$1'
  },

  // =====================================================================================
  // COVERAGE CONFIGURATION
  // =====================================================================================
  collectCoverageFrom: [
    'catalog-service/src/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/index.ts',
    '!**/*.config.ts',
    '!**/*.types.ts'
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
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // =====================================================================================
  // TEST SETUP
  // =====================================================================================
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  globalSetup: '<rootDir>/test-global-setup.ts',
  globalTeardown: '<rootDir>/test-global-teardown.ts',

  // =====================================================================================
  // TEST CATEGORIES
  // =====================================================================================
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/admin-console/',
    '<rootDir>/seller-console/',
    '<rootDir>/courier-console/',
    '<rootDir>/supplier-console/',
    '<rootDir>/enabler-console/',
    '<rootDir>/tests/e2e/'
  ],

  // =====================================================================================
  // PERFORMANCE AND TIMEOUTS
  // =====================================================================================
  testTimeout: 10000,
  slowTestThreshold: 5000,

  // =====================================================================================
  // REPORTERS AND OUTPUT
  // =====================================================================================
  reporters: [
    'default'
    // Note: Additional reporters like jest-junit and jest-html-reporter
    // can be added when the corresponding packages are installed
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
    '<rootDir>/admin-console/',
    '<rootDir>/seller-console/',
    '<rootDir>/courier-console/',
    '<rootDir>/supplier-console/',
    '<rootDir>/enabler-console/',
    '<rootDir>/reports/'
  ],

  // =====================================================================================
  // CI/CD OPTIMIZATIONS
  // =====================================================================================
  ...(process.env.CI && {
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'json-summary', 'cobertura'],
    reporters: ['default'],
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
  }),

  // =====================================================================================
  // SERVICE-SPECIFIC PROJECTS
  // =====================================================================================
  projects: [
    {
      displayName: 'catalog-service',
      testMatch: ['<rootDir>/catalog-service/src/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/catalog-service/tests/setup.ts'],
      collectCoverageFrom: ['catalog-service/src/**/*.{ts,js}'],
      coverageDirectory: 'coverage/catalog-service'
    },
    // Add other services as they implement Jest configurations
    // {
    //   displayName: 'auth-service',
    //   testMatch: ['<rootDir>/auth-service/src/**/*.test.ts'],
    //   ...
    // }
  ]
};
