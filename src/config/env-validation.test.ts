import { validateEnv } from './env-validation';

describe('validateEnv (Joi)', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('returns validated environment for valid values', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://localhost/db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'secret'
    };

    const result = validateEnv();

    expect(result.NODE_ENV).toBe('test');
    expect(result.PORT).toBe(3000);
    expect(result.JWT_EXPIRES_IN).toBe('7d');
  });

  it('logs details and exits for invalid environment', () => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: '',
      JWT_SECRET: ''
    };

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);

    // process.exit is mocked, so execution continues past the guard and the
    // partial Joi value is returned; the observable contract of this branch is
    // the error log + exit code, which is what is asserted below.
    validateEnv();

    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Environment validation failed. Missing or invalid variables:'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
