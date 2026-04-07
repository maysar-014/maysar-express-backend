jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('google oauth config', () => {
  const previousEnv = { ...process.env };
  let logSpy: jest.SpyInstance;

  const loadConfigModule = async () => {
    jest.resetModules();
    return import('../google-oauth.config');
  };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('uses defaults and reports missing required credentials', async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_CALLBACK_URL;
    delete process.env.BASE_URL;
    delete process.env.PLATFORM_BASE_URL;

    const { googleOAuthConfig, validateGoogleOAuthConfig } = await loadConfigModule();
    const validation = validateGoogleOAuthConfig();

    expect(googleOAuthConfig.callbackUrl).toBe('http://localhost:3001/api/auth/oauth/callback');
    expect(googleOAuthConfig.scopes).toEqual(['openid', 'profile', 'email']);
    expect(googleOAuthConfig.state).toBe(true);
    expect(googleOAuthConfig.verificationEmail).toBe(true);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        'GOOGLE_OAUTH_CLIENT_ID is required',
        'GOOGLE_OAUTH_CLIENT_SECRET is required'
      ])
    );
  });

  it('uses the staging base url when callback is not explicitly configured', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.BASE_URL = 'https://api-staging.maysar.co.tz';
    process.env.GOOGLE_OAUTH_CLIENT_ID = '1234567890-example.apps.googleusercontent.com';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'super-secret-value';
    delete process.env.GOOGLE_OAUTH_CALLBACK_URL;

    const { googleOAuthConfig, validateGoogleOAuthConfig } = await loadConfigModule();
    const validation = validateGoogleOAuthConfig();

    expect(googleOAuthConfig.callbackUrl).toBe('https://api-staging.maysar.co.tz/api/auth/oauth/callback');
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('rejects localhost oauth callbacks in staging', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.BASE_URL = 'https://api-staging.maysar.co.tz';
    process.env.GOOGLE_OAUTH_CLIENT_ID = '1234567890-example.apps.googleusercontent.com';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'super-secret-value';
    process.env.GOOGLE_OAUTH_CALLBACK_URL = 'http://localhost:3001/api/auth/oauth/callback';

    const { validateGoogleOAuthConfig } = await loadConfigModule();
    const validation = validateGoogleOAuthConfig();

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        'GOOGLE_OAUTH_CALLBACK_URL must not use localhost in staging'
      ])
    );
  });

  it('rejects legacy oauth callback paths in staging', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.BASE_URL = 'https://api-staging.maysar.co.tz';
    process.env.GOOGLE_OAUTH_CLIENT_ID = '1234567890-example.apps.googleusercontent.com';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'super-secret-value';
    process.env.GOOGLE_OAUTH_CALLBACK_URL = 'https://api-staging.maysar.co.tz/auth/google/callback';

    const { validateGoogleOAuthConfig } = await loadConfigModule();
    const validation = validateGoogleOAuthConfig();

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        'GOOGLE_OAUTH_CALLBACK_URL must point to /api/auth/oauth/callback in staging'
      ])
    );
  });

  it('flags invalid format and numeric boundary violations', async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'bad-client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'short';
    process.env.GOOGLE_OAUTH_CALLBACK_URL = 'not-a-url';
    process.env.GOOGLE_OAUTH_PROMPT = 'invalid_prompt';
    process.env.GOOGLE_OAUTH_ACCESS_TYPE = 'invalid_access';
    process.env.GOOGLE_OAUTH_ALLOWED_DOMAINS = 'example.com,bad_domain';
    process.env.GOOGLE_OAUTH_SESSION_TIMEOUT = '100';
    process.env.GOOGLE_OAUTH_MAX_RETRIES = '22';
    process.env.GOOGLE_OAUTH_RETRY_DELAY = '100';

    const { validateGoogleOAuthConfig } = await loadConfigModule();
    const validation = validateGoogleOAuthConfig();

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        'GOOGLE_OAUTH_CLIENT_ID format is invalid',
        'GOOGLE_OAUTH_CLIENT_SECRET must be at least 10 characters long',
        'GOOGLE_OAUTH_CALLBACK_URL must be a valid URL',
        'GOOGLE_OAUTH_PROMPT must be one of: consent, none, select_account',
        'GOOGLE_OAUTH_ACCESS_TYPE must be one of: online, offline',
        'Invalid domains in GOOGLE_OAUTH_ALLOWED_DOMAINS: bad_domain',
        'GOOGLE_OAUTH_SESSION_TIMEOUT must be at least 300000ms (5 minutes)',
        'GOOGLE_OAUTH_MAX_RETRIES must be between 0 and 10',
        'GOOGLE_OAUTH_RETRY_DELAY must be at least 500ms'
      ])
    );
  });

  it('initialization exits when validation fails', async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    process.env.GOOGLE_OAUTH_CALLBACK_URL = 'https://example.com/callback';

    const { initializeGoogleOAuthConfig } = await loadConfigModule();
    const exitError = new Error('process.exit called');
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw exitError;
    }) as never);

    expect(() => initializeGoogleOAuthConfig()).toThrow(exitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('validates and initializes successfully with complete configuration', async () => {
    process.env.NODE_ENV = 'development';
    process.env.GOOGLE_OAUTH_CLIENT_ID = '1234567890-example.apps.googleusercontent.com';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'super-secret-value';
    process.env.GOOGLE_OAUTH_CALLBACK_URL = 'https://example.com/api/auth/oauth/callback';
    process.env.GOOGLE_OAUTH_PROMPT = 'consent';
    process.env.GOOGLE_OAUTH_ACCESS_TYPE = 'offline';
    process.env.GOOGLE_OAUTH_ENABLE_STATE = 'true';
    process.env.GOOGLE_OAUTH_ALLOWED_DOMAINS = 'example.com,company.org';
    process.env.GOOGLE_OAUTH_SESSION_TIMEOUT = '600000';
    process.env.GOOGLE_OAUTH_MAX_RETRIES = '3';
    process.env.GOOGLE_OAUTH_RETRY_DELAY = '1000';

    const { validateGoogleOAuthConfig, initializeGoogleOAuthConfig } = await loadConfigModule();
    const validation = validateGoogleOAuthConfig();

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);

    initializeGoogleOAuthConfig();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Google OAuth configuration validation passed')
    );
  });
});
