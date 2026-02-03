/**
 * Global Test Teardown
 * Runs once after all test suites complete
 */

module.exports = async (): Promise<void> => {
  console.log('[GLOBAL TEARDOWN] Cleaning up test environment...');

  // Cleanup global test database if needed
  if (process.env.TEST_DB_GLOBAL_CLEANUP) {
    console.log('[GLOBAL TEARDOWN] Cleaning up global test database...');
    // Global database cleanup would go here
    // This runs once after all tests
  }

  // Cleanup external service mocks
  if (process.env.MOCK_EXTERNAL_SERVICES) {
    console.log('[GLOBAL TEARDOWN] Cleaning up external service mocks...');
    // Cleanup external service mocking would go here
  }

  // Report test metrics if collected
  if ((global as any).testMetrics) {
    const metrics = (global as any).testMetrics;
    const duration = Date.now() - metrics.startTime;

    console.log('[GLOBAL TEARDOWN] Test Metrics:');
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Total Tests: ${metrics.testCount}`);
    console.log(`  - Passed: ${metrics.passedTests}`);
    console.log(`  - Failed: ${metrics.failedTests}`);
    console.log(`  - Success Rate: ${metrics.testCount > 0 ? ((metrics.passedTests / metrics.testCount) * 100).toFixed(1) : 0}%`);
  }

  // Final cleanup
  console.log('[GLOBAL TEARDOWN] Test environment cleanup completed');
};
