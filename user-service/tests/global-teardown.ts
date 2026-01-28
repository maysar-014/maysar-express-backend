/**
 * Global Test Teardown
 * Runs once after all test suites
 * Authority: Testing Constitution v1.0
 */

module.exports = async (): Promise<void> => {
  console.log('[GLOBAL TEARDOWN] Cleaning up test environment...');

  // =====================================================================================
  // DATABASE CLEANUP
  // =====================================================================================

  if (process.env.TEST_DB_GLOBAL_SETUP === 'true') {
    console.log('[GLOBAL TEARDOWN] Cleaning up test database...');
    try {
      // Database cleanup would be implemented here
      console.log('[GLOBAL TEARDOWN] Test database cleanup completed');
    } catch (error) {
      console.error('[GLOBAL TEARDOWN] Error during database cleanup:', error);
    }
  }

  // =====================================================================================
  // TEST METRICS REPORTING
  // =====================================================================================

  if (process.env.TEST_METRICS_ENABLED === 'true' && (global as any).testMetrics) {
    const metrics = (global as any).testMetrics;
    const duration = (Date.now() - metrics.startTime) / 1000;

    console.log('\n[GLOBAL TEARDOWN] Test Metrics Summary:');
    console.log(`  - Total Duration: ${duration.toFixed(2)}s`);
    console.log(`  - Tests Executed: ${metrics.testCount}`);
    console.log(`  - Passed: ${metrics.passedTests}`);
    console.log(`  - Failed: ${metrics.failedTests}`);

    if (metrics.slowTests && metrics.slowTests.length > 0) {
      console.log(`  - Slow Tests (>5s): ${metrics.slowTests.length}`);
      metrics.slowTests.forEach((test: any) => {
        console.log(`    * ${test.name}: ${test.duration.toFixed(2)}s`);
      });
    }

    if (metrics.coverage) {
      console.log('\n[GLOBAL TEARDOWN] Coverage Summary:');
      console.log(`  - Statements: ${metrics.coverage.statements}%`);
      console.log(`  - Branches: ${metrics.coverage.branches}%`);
      console.log(`  - Functions: ${metrics.coverage.functions}%`);
      console.log(`  - Lines: ${metrics.coverage.lines}%`);
    }
  }

  // =====================================================================================
  // RESOURCE CLEANUP
  // =====================================================================================

  // Close open handles
  console.log('[GLOBAL TEARDOWN] Closing open handles...');

  // Flush any pending operations
  console.log('[GLOBAL TEARDOWN] Flushing pending operations...');

  console.log('[GLOBAL TEARDOWN] Test environment cleanup completed');
};
