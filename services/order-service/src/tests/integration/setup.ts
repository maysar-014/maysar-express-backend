// Integration test setup
import { performance } from 'perf_hooks';

// Cast to any to avoid TypeScript "does not exist on globalThis" errors
// for the test-only globals we attach here.
const g = global as any;

// Global test configuration
g.testStartTime = performance.now();
g.testConfig = {
  apiTimeout: 5000,
  maxRetries: 3,
  cacheTimeout: 300,
  loadTestRPS: 1000,
  accuracyTarget: 0.998
};

// Mock console for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: jest.fn()
};

// Setup test environment
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');

  // Initialize test database connections
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/maysar_test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';

  // Set test timeouts
  jest.setTimeout(60000);
});

afterAll(async () => {
  const testDuration = performance.now() - g.testStartTime;
  console.log(`✅ Integration tests completed in ${(testDuration / 1000).toFixed(2)}s`);

  // Cleanup
  delete g.testStartTime;
  delete g.testConfig;
});
