/**
 * Jest Integration Configuration
 * Specialized config for integration and end-to-end tests
 */

module.exports = {
  ...require('./jest.config.js'),

  // Integration test specific settings
  testMatch: [
    '**/__tests__/integration/**/*.test.ts',
    '**/__tests__/integration/**/*.spec.ts',
    '**/?(*.)+(integration|spec).ts'
  ],

  // Setup files for integration tests
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts',
    '<rootDir>/test/setup.integration.ts'
  ],

  // Longer timeout for integration tests
  testTimeout: 60000,

  // Slower test environment detection
  detectOpenHandles: false,
  forceExit: false,

  // More verbose output for integration tests
  verbose: false,

  // Custom reporters for integration tests
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports/integration',
      outputName: 'junit.xml',
      suiteName: 'Order Service Integration Tests'
    }]
  ]
};
