describe('config/env-validator (zod)', () => {
  const originalEnv = process.env;

  const validEnv = {
    NODE_ENV: 'test',
    DATABASE_URL: 'https://db.example.com',
    REDIS_URL: 'https://redis.example.com',
    USER_SERVICE_JWT_SECRET: 'user-secret',
    USER_SERVICE_JWT_EXPIRES_IN: '1d',
    AUTH_SERVICE_SESSION_SECRET: 'auth-secret',
    CATALOG_SERVICE_DB_HOST: 'localhost',
    CATALOG_SERVICE_DB_PORT: '5432',
    CATALOG_SERVICE_DB_NAME: 'catalog',
    CATALOG_SERVICE_DB_USER: 'user',
    CATALOG_SERVICE_DB_PASSWORD: 'pass',
    SMS_SERVICE_API_KEY: 'key',
    SMS_SERVICE_PROVIDER: 'provider'
  };

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('exports parsed env object when environment is valid', () => {
    process.env = { ...originalEnv, ...validEnv };

    const module = require('./env-validator');

    expect(module.env.NODE_ENV).toBe('test');
    expect(module.env.CATALOG_SERVICE_DB_PORT).toBe(5432);
    expect(module.validateEnv()).toEqual(module.env);
  });

  it('logs and exits when environment is invalid', () => {
    process.env = { ...originalEnv, ...validEnv };
    // An *existing* variable is not re-injected by dotenv.config(), whereas a
    // deleted one is (the module calls dotenv.config() at import time and .env
    // carries a valid DATABASE_URL), which is why the value must be invalid
    // rather than absent for this branch to be reachable.
    process.env.DATABASE_URL = 'not-a-url';

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);

    jest.isolateModules(() => {
      require('./env-validator');
    });

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Invalid environment variables:',
      expect.any(Object)
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
