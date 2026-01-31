/** @type {import('jest').Config} */

// =====================================================================================
// JEST CONFIGURATION - TESTING CONSTITUTION COMPLIANT
// Comprehensive testing setup with coverage, performance monitoring, and quality gates
// Authority: Testing Constitution v1.0
// =====================================================================================

module.exports = {
  // =====================================================================================
  // BASIC CONFIGURATION
  // =====================================================================================
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '!src/**/*.d.ts'
  ],

  // =====================================================================================
  // TRANSFORMATION - TypeScript Support
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

  // =====================================================================================
  // MODULE ALIASES - Path Mapping for Imports
  // =====================================================================================
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // =====================================================================================
  // COVERAGE CONFIGURATION - Testing Constitution Compliance
  // =====================================================================================
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.config.ts',
    '!src/**/*.types.ts',
    '!src/**/*setup*.ts'
  ],

  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tests/',
    '.*setup.*\\.ts$'
  ],

  coverageDirectory: '<rootDir>/coverage',

  coverageReporters: [
    ['text', { maxCols: 200 }],
    'text-summary',
    'lcov',
    'html',
    'json-summary',
    'cobertura'
  ],

  // =====================================================================================
  // COVERAGE THRESHOLDS - Per Testing Constitution
  // =====================================================================================
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/domain/value-objects/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/domain/policies/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/domain/engines/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/application/use-cases/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/application/sagas/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // =====================================================================================
  // TEST SETUP - Global Configuration
  // =====================================================================================
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // =====================================================================================
  // TEST SEQUENCING AND ISOLATION
  // =====================================================================================
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/e2e/'
  ],

  maxWorkers: process.env.CI ? 2 : '50%',
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // =====================================================================================
  // PERFORMANCE AND TIMEOUTS - Per Testing Constitution
  // =====================================================================================
  testTimeout: 10000, // 10 seconds
  slowTestThreshold: 5000, // 5 seconds - tests over 5s are flagged

  // =====================================================================================
  // WATCH MODE CONFIGURATION
  // =====================================================================================
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/reports/'
  ],

  // =====================================================================================
  // MOCK BEHAVIOR
  // =====================================================================================
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // =====================================================================================
  // REPORTERS AND OUTPUT
  // =====================================================================================
  reporters: [
    'default',
    ['summary', {}]
  ],

  // =====================================================================================
  // CI/CD OPTIMIZATIONS
  // =====================================================================================
  ...(process.env.CI && {
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'json-summary', 'cobertura'],
    maxWorkers: 2,
    testTimeout: 15000,
    verbose: true
  }),

  // =====================================================================================
  // DEBUG MODE
  // =====================================================================================
  ...(process.env.DEBUG && {
    verbose: true,
    testNamePattern: process.env.TEST_PATTERN || '',
    testPathPattern: process.env.TEST_PATH_PATTERN || ''
  })
};
