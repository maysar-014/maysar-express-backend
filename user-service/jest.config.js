/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Roots for test discovery
  roots: ['<rootDir>/src', '<rootDir>/test'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.ts'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test setup
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Collect coverage from files
  collectCoverage: true,

  // Verbose output
  verbose: true,

  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',

  // Detect open handles
  detectOpenHandles: true,

  // Force exit
  forceExit: true,

  // Run tests in parallel
  maxWorkers: '50%'
};
