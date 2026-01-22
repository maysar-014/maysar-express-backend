/**
 * Global Test Setup - Root Level
 * Runs once before all test suites
 */

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TZ = 'UTC';

  console.log('[GLOBAL SETUP] Initializing monorepo test environment...');

  // Initialize test metrics collection
  (global).testMetrics = {
    startTime: Date.now(),
    testCount: 0,
    passedTests: 0,
    failedTests: 0
  };

  console.log('[GLOBAL SETUP] Test environment initialized successfully');
};
