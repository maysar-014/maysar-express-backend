/**
 * Global Test Setup
 * Runs once before all test suites
 */

module.exports = async (): Promise<void> => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

  console.log('[GLOBAL SETUP] Initializing test environment...');

  // Setup global test database if needed
  if (process.env.TEST_DB_GLOBAL_SETUP) {
    console.log('[GLOBAL SETUP] Setting up global test database...');
    // Global database setup would go here
    // This runs once before all tests
  }

  // Setup global external service mocks
  if (process.env.MOCK_EXTERNAL_SERVICES) {
    console.log('[GLOBAL SETUP] Setting up external service mocks...');
    // Global external service mocking would go here
  }

  // Initialize test metrics collection
  if (process.env.TEST_METRICS_ENABLED) {
    console.log('[GLOBAL SETUP] Initializing test metrics...');
    (global as any).testMetrics = {
      startTime: Date.now(),
      testCount: 0,
      passedTests: 0,
      failedTests: 0
    };
  }

  console.log('[GLOBAL SETUP] Test environment initialized successfully');
};