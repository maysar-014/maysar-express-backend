import { config } from '../src/config';

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  // Setup test database if needed
  if (config.get('development').testDatabaseUrl) {
    process.env.DATABASE_URL = config.get('development').testDatabaseUrl;
  }

  // Disable external services in tests
  process.env.EVENT_PUBLISHING_ENABLED = 'false';
  process.env.METRICS_ENABLED = 'false';
  process.env.LOG_EXTERNAL_URL = '';

  console.log('Test environment setup complete');
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset modules if needed
  jest.resetModules();
});

afterEach(() => {
  // Clean up after each test
});

afterAll(async () => {
  // Clean up test database connections
  console.log('Test environment cleanup complete');
});
