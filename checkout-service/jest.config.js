/**
 * Checkout Service Jest Configuration
 * 
 * Follows Testing Constitution:
 * - Domain tests: 98% coverage target
 * - Application tests: 90% coverage target
 * - Infrastructure tests: 75% coverage target
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: {
        ignoreCodes: ['TS151001']
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@checkout/(.*)$': '<rootDir>/src/$1'
  },

  // Coverage Configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
    '!src/**/*.config.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'cobertura'],
  
  // Coverage Thresholds by Layer
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/domain/**': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/application/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test Setup
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  slowTestThreshold: 5000,

  // Performance
  maxWorkers: process.env.CI ? 2 : '50%',
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Reporters
  reporters: ['default'],

  // Watch Mode
  watchPathIgnorePatterns: [
    'node_modules',
    'dist',
    'coverage'
  ],

  // CI/CD Optimizations
  ...(process.env.CI && {
    collectCoverage: true,
    maxWorkers: 2,
    testTimeout: 15000
  })
};
