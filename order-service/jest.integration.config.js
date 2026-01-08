module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/integration/setup.ts'],
  globalTeardown: '<rootDir>/src/tests/integration/teardown.ts',
  
  // Performance settings
  testTimeout: 60000, // 60 seconds for load tests
  maxWorkers: 4, // Parallel execution
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/domain/services/*.engine.ts',
    '!src/tests/**',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Test reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/integration',
      outputName: 'junit.xml'
    }]
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Fail fast on first failure for critical tests
  bail: false,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};