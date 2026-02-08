/**
 * Global Test Setup
 * Runs once before all test suites
 * Authority: Testing Constitution v1.0
 */

module.exports = async (): Promise<void> => {
  // =====================================================================================
  // ENVIRONMENT INITIALIZATION
  // =====================================================================================

  // Load environment variables from root .env
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

  // Increase max event listeners to prevent warnings with many test suites
  process.setMaxListeners(20);

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only-do-not-use-in-production';

  // Use provided DATABASE_URL or fallback to a test-specific one if needed
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://maysar_user:M@ys4r2026!Db@localhost:5432/maysar_db?sslmode=prefer';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

  console.log('[GLOBAL SETUP] Initializing test environment...');
  console.log(`[GLOBAL SETUP] Test Environment: ${process.env.NODE_ENV}`);
  console.log(`[GLOBAL SETUP] Database URL: ${process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@')}`); // Mask password

  // =====================================================================================
  // TEST INFRASTRUCTURE SETUP
  // =====================================================================================

  // Initialize global test database if configured
  if (process.env.TEST_DB_GLOBAL_SETUP === 'true' || true) { // Always check for now to fix connection
    console.log('[GLOBAL SETUP] Checking database connection...');
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });
      await prisma.$connect();
      console.log('[GLOBAL SETUP] Database connection successful');
      await prisma.$disconnect();
    } catch (error) {
      console.error('[GLOBAL SETUP] CRITICAL: Failed to connect to the database.');
      console.error(`[GLOBAL SETUP] Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('[GLOBAL SETUP] Checking Redis connection...');
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      const pingResponse = await redis.ping();
      if (pingResponse === 'PONG') {
        console.log('[GLOBAL SETUP] Redis connection successful');
      } else {
        console.warn(`[GLOBAL SETUP] Redis returned unexpected ping response: ${pingResponse}`);
      }
      await redis.quit();
    } catch (error) {
      console.error('[GLOBAL SETUP] CRITICAL: Failed to connect to Redis.');
      console.error(`[GLOBAL SETUP] Error: ${error instanceof Error ? error.message : String(error)}`);
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
