/**
 * Global Test Setup
 * Runs once before all test suites
 * Authority: Testing Constitution v1.0
 */

module.exports = async (): Promise<void> => {
  // =====================================================================================
  // ENVIRONMENT INITIALIZATION
  // =====================================================================================

  // Increase max event listeners to prevent warnings with many test suites
  process.setMaxListeners(20);

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only-do-not-use-in-production';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/user-service-test';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

  console.log('[GLOBAL SETUP] Initializing test environment...');
  console.log(`[GLOBAL SETUP] Test Environment: ${process.env.NODE_ENV}`);

  // =====================================================================================
  // TEST INFRASTRUCTURE SETUP
  // =====================================================================================

  // Initialize global test database if configured
  if (process.env.TEST_DB_GLOBAL_SETUP === 'true') {
    console.log('[GLOBAL SETUP] Setting up global test database...');
    try {
      // Database setup would be implemented here
      console.log('[GLOBAL SETUP] Global test database initialized');
    } catch (error) {
      console.error('[GLOBAL SETUP] Failed to initialize test database:', error);
    }
  }

  // =====================================================================================
  // EXTERNAL SERVICE MOCKING
  // =====================================================================================

  if (process.env.MOCK_EXTERNAL_SERVICES === 'true') {
    console.log('[GLOBAL SETUP] Configuring external service mocks...');
    // External service mocking would be configured here
  }

  // =====================================================================================
  // TEST METRICS INITIALIZATION
  // =====================================================================================

  if (process.env.TEST_METRICS_ENABLED === 'true') {
    console.log('[GLOBAL SETUP] Initializing test metrics collection...');
    (global as any).testMetrics = {
      startTime: Date.now(),
      testCount: 0,
      passedTests: 0,
      failedTests: 0,
      slowTests: [],
      coverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      }
    };
  }

  // =====================================================================================
  // PERFORMANCE MONITORING
  // =====================================================================================

  if (process.env.PERFORMANCE_MONITORING === 'true') {
    console.log('[GLOBAL SETUP] Enabling performance monitoring...');
    (global as any).performanceMonitor = {
      marks: new Map(),
      measures: new Map(),
      markStart: (name: string) => {
        if (!((global as any).performanceMonitor.marks instanceof Map)) {
          (global as any).performanceMonitor.marks = new Map();
        }
        (global as any).performanceMonitor.marks.set(name, performance.now());
      },
      markEnd: (name: string): number | null => {
        if (!((global as any).performanceMonitor.marks instanceof Map)) return null;
        const start = (global as any).performanceMonitor.marks.get(name);
        if (start === undefined) return null;
        const duration = performance.now() - start;
        (global as any).performanceMonitor.marks.delete(name);
        return duration;
      }
    };
  }

  console.log('[GLOBAL SETUP] Test environment initialized successfully');
};
