describe('auth service local test setup module', () => {
  const originalConsole = global.console;
  const originalEnv = { ...process.env };

  afterEach(() => {
    global.console = originalConsole;
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('sets test defaults and console mocks when imported', async () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'different-secret';
    process.env.DATABASE_URL = 'postgresql://localhost/dev';
    process.env.REDIS_URL = 'redis://localhost:6380';

    await import('./test-setup');

    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret-key-for-testing-only');
    expect(process.env.DATABASE_URL).toBe('file:./test.db');
    expect(process.env.REDIS_URL).toBe('redis://localhost:6379/1');
    expect(jest.isMockFunction(global.console.debug)).toBe(true);
    expect(jest.isMockFunction(global.console.info)).toBe(true);
    expect(jest.isMockFunction(global.console.warn)).toBe(true);
    expect(jest.isMockFunction(global.console.error)).toBe(true);
  });
});
