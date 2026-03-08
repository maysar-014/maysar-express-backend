describe('config index', () => {
  const previousEnv = { ...process.env };

  const loadConfigModule = async () => {
    jest.resetModules();
    return import('../index');
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('loads base config when required environment variables are present', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://db/test';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.REDIS_URL = 'redis://localhost:6379/2';
    process.env.PORT = '4100';

    const { config } = await loadConfigModule();

    expect(config.environment).toBe('test');
    expect(config.isTest).toBe(true);
    expect(config.port).toBe(4100);
    expect(config.database.url).toBe('postgresql://db/test');
    expect(config.redis.url).toBe('redis://localhost:6379/2');
  });

  it('reports validation errors for weak jwt and missing conditional credentials', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://db/test';
    process.env.JWT_SECRET = 'too-short';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.ENABLE_PHONE_VERIFICATION = 'true';
    delete process.env.SMTP_USER;
    delete process.env.TWILIO_ACCOUNT_SID;

    const { validateConfiguration } = await loadConfigModule();
    const validation = validateConfiguration();

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        'JWT_SECRET must be at least 32 characters long',
        'SMTP_USER is required when email verification is enabled',
        'Twilio credentials are required when phone verification is enabled'
      ])
    );
  });

  it('throws during module load when required env variables are missing', async () => {
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.DATABASE_URL = '';
    process.env.REDIS_URL = '';

    await expect(loadConfigModule()).rejects.toThrow(
      'Missing required environment variables: DATABASE_URL, REDIS_URL'
    );
  });

  it('initialization exits when validation fails', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://db/test';
    process.env.JWT_SECRET = 'short';
    process.env.REDIS_URL = 'redis://localhost:6379';
    delete process.env.SMTP_USER;

    const { initializeConfiguration } = await loadConfigModule();
    const exitError = new Error('process.exit called');
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw exitError;
    }) as never);

    expect(() => initializeConfiguration()).toThrow(exitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
