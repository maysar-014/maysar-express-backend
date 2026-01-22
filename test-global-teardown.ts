/**
 * Global Test Teardown - Root Level
 * Runs once after all test suites complete
 */

module.exports = async () => {
  console.log('[GLOBAL TEARDOWN] Cleaning up monorepo test environment...');

  // Report test metrics if collected
  const metrics = global.testMetrics;
  if (metrics) {
    const duration = Date.now() - metrics.startTime;

    console.log('[GLOBAL TEARDOWN] Test Metrics:');
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Total Tests: ${metrics.testCount}`);
    console.log(`  - Passed: ${metrics.passedTests}`);
    console.log(`  - Failed: ${metrics.failedTests}`);
    console.log(`  - Success Rate: ${metrics.testCount > 0 ? ((metrics.passedTests / metrics.testCount) * 100).toFixed(1) : 0}%`);
  }

  console.log('[GLOBAL TEARDOWN] Test environment cleanup completed');
};
